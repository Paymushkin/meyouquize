import { FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { socket } from "../socket";

type CreateForm = {
  title: string;
  questionsJson: string;
};

type StateQuizPayload = {
  activeQuestion: { id: string } | null;
};

const defaultJson = JSON.stringify(
  [
    {
      text: "2 + 2 = ?",
      type: "single",
      points: 1,
      options: [
        { text: "4", isCorrect: true },
        { text: "5", isCorrect: false },
      ],
    },
  ],
  null,
  2,
);

export function AdminPage() {
  const { adminPath = "" } = useParams();
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState(false);
  const [quizId, setQuizId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [qrData, setQrData] = useState("");
  const [form, setForm] = useState<CreateForm>({
    title: "Demo quiz",
    questionsJson: defaultJson,
  });
  const [message, setMessage] = useState("");

  const apiBase = useMemo(() => "http://localhost:4000", []);
  const adminUrlHint = `/admin/${adminPath}`;

  async function login(event?: FormEvent) {
    event?.preventDefault();
    if (!password.trim()) {
      setMessage("Введите пароль");
      return;
    }
    const response = await fetch(`${apiBase}/api/${adminPath}/auth`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setMessage("Auth failed");
      return;
    }
    setAuth(true);
    if (!socket.connected) socket.connect();
    socket.emit("admin:set-auth", true);
    socket.on("state:quiz", (payload: StateQuizPayload) => {
      if (payload.activeQuestion?.id) setQuestionId(payload.activeQuestion.id);
    });
    setMessage("Authenticated");
  }

  async function createQuizAction() {
    try {
      const payload = {
        title: form.title,
        questions: JSON.parse(form.questionsJson),
      };
      socket.once("quiz:created", async (quiz: { id: string; slug: string; accessToken: string }) => {
        setQuizId(quiz.id);
        const url = `${window.location.origin}/q/${quiz.slug}?token=${quiz.accessToken}`;
        setJoinUrl(url);
        const qr = await QRCode.toDataURL(url);
        setQrData(qr);
      });
      socket.emit("quiz:create", payload);
    } catch {
      setMessage("Invalid questions JSON");
    }
  }

  function activateNext() {
    if (!quizId) return;
    socket.emit("question:activate", { quizId });
  }

  function closeCurrent() {
    if (!quizId || !questionId) return;
    socket.emit("question:close", { quizId, questionId });
  }

  function finishQuiz() {
    if (!quizId) return;
    socket.emit("quiz:finish", { quizId });
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", fontFamily: "sans-serif", padding: 16 }}>
      <h1>Admin</h1>
      {!auth && (
        <section>
          <h2>Вход в админку</h2>
          <p>Адрес: {adminUrlHint}</p>
          <form onSubmit={login}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль администратора"
            />
            <button type="submit">Войти</button>
          </form>
        </section>
      )}
      {auth && (
        <section>
          <h2>Create quiz</h2>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Quiz title"
          />
          <textarea
            style={{ width: "100%", minHeight: 260 }}
            value={form.questionsJson}
            onChange={(e) => setForm((prev) => ({ ...prev, questionsJson: e.target.value }))}
          />
          <button onClick={createQuizAction}>Create</button>

          <h2>Control</h2>
          <input value={quizId} onChange={(e) => setQuizId(e.target.value)} placeholder="Quiz ID" />
          <input
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            placeholder="Current Question ID"
          />
          <div>
            <button onClick={activateNext}>Activate next question</button>
            <button onClick={closeCurrent}>Close current question</button>
            <button onClick={finishQuiz}>Finish quiz</button>
          </div>
          {joinUrl && (
            <div>
              <p>{joinUrl}</p>
              {qrData && <img src={qrData} alt="quiz-qr" style={{ width: 220, height: 220 }} />}
            </div>
          )}
        </section>
      )}
      {message && <p>{message}</p>}
    </main>
  );
}
