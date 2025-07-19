import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "./App.css";

const App = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [marks, setMarks] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    setPdfFile(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("http://localhost:8000/upload", formData);
      alert("✅ PDF uploaded successfully");
    } catch (error) {
      console.error("❌ Upload error", error);
    }
  };

  const handleGenerateQuestions = async () => {
    setLoadingGenerate(true);
    try {
      const response = await axios.post("http://localhost:8000/questions", {
        topic,
        num_questions: parseInt(numQuestions),
        marks: parseInt(marks),
        difficulty
      });

      const generated = response.data.questions;
      setQuestions(generated);
      setAnswers([]);
    } catch (err) {
      console.error("❌ Question generation failed", err);
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleShowAnswers = async () => {
    setLoadingAnswer(true);
    try {
      const response = await axios.post("http://localhost:8000/answer", {
        questions,
        marks: parseInt(marks)
      });

      setAnswers(response.data.answers);
    } catch (err) {
      console.error("❌ Answer fetch failed", err);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`📄 AI Generated Questions\n\n`, 10, 20);

    questions.forEach((q, i) => {
      doc.text(`${i + 1}. ${q}`, 10, 30 + i * 10);
    });

    doc.save("ai_generated_questions.pdf");
  };

  return (
    <div className="app-container">
      <h1 className="title">📄 AI Question Generator + Answer Finder</h1>

      <div className="upload-section">
        <label className="file-label">📂 Upload PDF:</label>
        <label className="custom-file-upload">
          <input type="file" accept="application/pdf" onChange={handlePdfUpload} />
          Choose File
        </label>
      </div>

      <div className="input-section">
        <input
          className="input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="🎯 Topic (e.g., Machine Learning)"
        />

        <input
          className="input"
          type="number"
          value={numQuestions}
          onChange={(e) => setNumQuestions(e.target.value)}
          placeholder="Number of questions"
        />

        <select className="dropdown" value={marks} onChange={(e) => setMarks(e.target.value)}>
          <option value={1}>1 mark</option>
          <option value={2}>2 marks</option>
          <option value={3}>3 marks</option>
          <option value={5}>5 marks</option>
        </select>

        <select className="dropdown" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button className="btn-generate" onClick={handleGenerateQuestions} disabled={loadingGenerate}>
          {loadingGenerate ? "⏳ Generating..." : "🎯 Generate Questions"}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="question-section">
          <h2>📝 Questions:</h2>
          {questions.map((q, i) => (
            <div key={i} className="question-box">
              {i + 1}. {q}
            </div>
          ))}
          <div className="btn-group">
            <button className="btn-answer" onClick={handleShowAnswers} disabled={loadingAnswer}>
              {loadingAnswer ? "⏳ Fetching Answers..." : "✅ Show Answers"}
            </button>

            <button className="btn-download" onClick={handleDownloadPDF}>
              📥 Download as PDF
            </button>
          </div>
        </div>
      )}

      {answers.length > 0 && (
        <div className="answer-section">
          <h2>📘 Answers:</h2>
          {answers.map((a, i) => (
            <p key={i} className="answer-box">
              <strong>{i + 1}.</strong> {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
