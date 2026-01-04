from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import re
import os
import platform
from agent_tools import generate_roadmap_excel, generate_roadmap_word

class AskRequest(BaseModel):
    history: str = ""
    question: str
    analysis_mode: bool = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

OLLAMA_API_URL = "http://localhost:11434/api/generate"

def parse_markdown_table_to_json(text):
    lines = text.strip().split('\n')
    data = []
    headers = []
    
    for line in lines:
        if '---' in line: continue
        if '|' in line:
            cells = [c.strip() for c in line.split('|') if c.strip() != '']
            if not headers:
                headers = cells
            else:
                if len(cells) == len(headers):
                    row_dict = {headers[i]: cells[i] for i in range(len(cells))}
                    data.append(row_dict)
    return data

def open_file_on_server(file_url):
    try:
        filename = file_url.split('/')[-1]
        file_path = os.path.join("static", "generated_docs", filename)
        abs_path = os.path.abspath(file_path)

        if os.path.exists(abs_path):
            if platform.system() == "Windows":
                os.startfile(abs_path)
            elif platform.system() == "Darwin":
                os.system(f"open '{abs_path}'")
            else:
                os.system(f"xdg-open '{abs_path}'")
    except Exception:
        pass

@app.post("/ask")
async def ask_ai(request: AskRequest):
    history = request.history
    question = request.question.strip()
    q_lower = question.lower()

    # --- 1. ROBUST INTENT DETECTION ---
    intent = "NO"

    # Priority A: Explicit Format Detection
    if any(k in q_lower for k in ['word', 'doc', 'docx', 'ms word', 'report']):
        intent = "YES_WORD"
    elif any(k in q_lower for k in ['excel', 'spreadsheet', 'csv', 'xlsx', 'sheet', 'sheets']):
        intent = "YES_EXCEL"
    
    # Priority B: Implicit Content Detection (Defaults)
    elif any(k in q_lower for k in ['roadmap', 'plan', 'table', 'tasks', 'steps']):
        intent = "YES_EXCEL" # Structure defaults to Excel
    elif any(k in q_lower for k in ['summary', 'overview', 'brief']):
        intent = "YES_WORD"  # Text-heavy defaults to Word

    # Priority C: Model Fallback (Only if regex failed)
    if intent == "NO":
        intent_prompt = f"""
        Analyze request: "{question}"
        - If user wants Excel/Spreadsheet/CSV -> Reply: YES_EXCEL
        - If user wants Word/Doc/Report -> Reply: YES_WORD
        - Else -> Reply: NO
        Reply ONLY with the code word.
        """
        try:
            resp = requests.post(OLLAMA_API_URL, json={"model": "llama3:instruct", "prompt": intent_prompt, "stream": False}).json()
            raw_intent = resp.get("response", "").strip().upper()
            if "EXCEL" in raw_intent: intent = "YES_EXCEL"
            elif "WORD" in raw_intent: intent = "YES_WORD"
        except:
            pass

    # --- 2. AGENTIC EXECUTION ---
    if "YES" in intent:
        # We adjust the prompt slightly depending on format
        format_instruction = "Target Format: JSON Array with fields 'Phase', 'Action', 'Timeline'"
        if intent == "YES_WORD":
            format_instruction = "Target Format: JSON Array with fields 'Topic', 'Description', 'Key Points'"

        extraction_prompt = f"""
        Task: Analyze the conversation history and extract a structured plan/summary based on the user's request: "{question}"
        History: {history}
        
        CRITICAL: Return the data strictly as a JSON ARRAY of objects. 
        {format_instruction}
        
        Do NOT use Markdown tables. Do NOT return plain text. Just the JSON array.
        """
        
        try:
            ext_resp = requests.post(OLLAMA_API_URL, json={"model": "llama3:instruct", "prompt": extraction_prompt, "stream": False}).json()
            raw_response = ext_resp.get("response", "").strip()
            
            steps = []
            json_match = re.search(r'\[.*\]', raw_response, re.DOTALL)
            if json_match:
                steps = json.loads(json_match.group(0))
            else:
                steps = parse_markdown_table_to_json(raw_response)
            
            if not steps: raise ValueError("No data extracted")

            file_url = ""
            msg = ""
            if "EXCEL" in intent:
                file_url = generate_roadmap_excel(steps)
                open_file_on_server(file_url)
                msg = f"I've generated the Excel spreadsheet for you. Link: {file_url}"
            else:
                # For Word, we use the question as the "Summary" title
                summary = f"Summary generated for request: {question}"
                file_url = generate_roadmap_word(summary, steps)
                open_file_on_server(file_url)
                msg = f"I've created the Word document for you. Link: {file_url}"
            
            return { "answer": msg, "attachment": file_url }

        except Exception:
            # Fallback to standard chat if tool fails
            pass

    # --- 3. STANDARD CHAT FALLBACK ---
    chat_prompt = f"Context:\n{history}\n\nUser: {question}\nResponse:"
    try:
        resp = requests.post(OLLAMA_API_URL, json={"model": "llama3:instruct", "prompt": chat_prompt, "stream": False}).json()
        return {"answer": resp.get("response", ""), "attachment": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))