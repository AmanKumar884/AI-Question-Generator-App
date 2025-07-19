from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import pdfplumber
import openai
from dotenv import load_dotenv

# Load .env variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize FastAPI app
app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to store uploaded PDF
pdf_path = "uploaded.pdf"


# ===== Pydantic Request Models =====
class QuestionRequest(BaseModel):
    topic: str
    num_questions: int
    marks: int
    difficulty: str


class AnswerRequest(BaseModel):
    questions: List[str]
    marks: int


# ====== Endpoints ======

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        with open(pdf_path, "wb") as f:
            f.write(contents)
        return {"message": "PDF uploaded successfully"}
    except Exception as e:
        return {"error": f"Failed to upload PDF: {str(e)}"}


@app.post("/questions")
def generate_questions(request: QuestionRequest):
    prompt = f"""
Generate {request.num_questions} {request.marks}-mark {request.difficulty} level questions on the topic: {request.topic}.
Number each question.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an exam question paper generator."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800
        )

        raw_output = response.choices[0].message.content
        questions = raw_output.strip().split("\n")
        clean_questions = [q.strip("0123456789. ") for q in questions if q.strip()]

        return {"questions": clean_questions}

    except Exception as e:
        return {"error": f"Failed to generate questions: {str(e)}"}


@app.post("/answer")
def get_answers(request: AnswerRequest):
    if not os.path.exists(pdf_path):
        return {"error": "PDF not found. Please upload a PDF first."}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            context = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
    except Exception as e:
        return {"error": f"Failed to read PDF: {str(e)}"}

    answers = []

    for idx, question in enumerate(request.questions, 1):
        prompt = f"""
Context:
{context}

Answer this {request.marks}-mark question ({idx}): {question}
"""

        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant. Answer only from the given context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500
            )
            answer = response.choices[0].message.content.strip()
        except Exception as e:
            answer = f"Error generating answer: {str(e)}"

        answers.append(answer)

    return {"answers": answers}
