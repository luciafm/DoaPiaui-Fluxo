import express from "express";
import cors from "cors";
import { db } from "./firebase-admin.js";

const app = express();

// AUMENTA O LIMITE PARA ACEITAR IMAGENS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// =========================
// ROTAS DE USUÁRIOS
// =========================
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha, whatsapp, bairro } = req.body;
  if (!nome || !email || !senha || !whatsapp || !bairro)
    return res.status(400).json({ msg: "Todos os campos são obrigatórios." });
  try {
    const snapshot = await db.collection("usuarios").where("email", "==", email).get();
    if (!snapshot.empty) return res.status(400).json({ msg: "Email já cadastrado." });
    const ref = await db.collection("usuarios").add({ nome, email, senha, whatsapp, bairro });
    res.status(201).json({ id: ref.id, msg: "Cadastro realizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ msg: "Email e senha obrigatórios." });
  try {
    const snapshot = await db.collection("usuarios").where("email", "==", email).limit(1).get();
    if (snapshot.empty) return res.status(401).json({ msg: "Email ou senha incorretos." });
    const usuario = snapshot.docs[0].data();
    const id = snapshot.docs[0].id;
    if (usuario.senha !== senha) return res.status(401).json({ msg: "Email ou senha incorretos." });
    res.status(200).json({ usuario: { id, ...usuario } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});

// =========================
// ROTAS DE DOAÇÕES
// =========================

// Buscar doação por ID → importante vir antes da rota genérica
app.get("/doacoes/:id", async (req, res) => {
  try {
    const docRef = db.collection("doacoes").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, msg: "Doação não encontrada." });
    }

    res.json({ success: true, doacao: { id: docSnap.id, ...docSnap.data() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erro ao buscar doação." });
  }
});

// Criar doação
app.post("/doacoes", async (req, res) => {
  try {
    const data = { ...req.body, criadoEm: new Date() };
    const ref = await db.collection("doacoes").add(data);
    res.status(201).json({ id: ref.id, msg: "Doação cadastrada!", doacao: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erro ao criar doação." });
  }
});

// Listar todas as doações
app.get("/doacoes", async (req, res) => {
  try {
    const snap = await db.collection("doacoes").orderBy("criadoEm", "desc").get();
    const doacoes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, doacoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erro ao buscar doações." });
  }
});

// Buscar doações por nome
app.get("/buscar", async (req, res) => {
  try {
    const { nome } = req.query;
    let query = db.collection("doacoes");
    if (nome) query = query.where("titulo", ">=", nome).where("titulo", "<=", nome + "\uf8ff");
    const snap = await query.get();
    const doacoes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, doacoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erro ao buscar doações." });
  }
});

// Atualizar doação
app.put("/doacoes/:id", async (req, res) => {
  try {
    await db.collection("doacoes").doc(req.params.id).update(req.body);
    res.json({ success: true, msg: "Doação atualizada.", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erro no servidor." });
  }
});

// Deletar doação
app.delete("/doacoes/:id", async (req, res) => {
  try {
    await db.collection("doacoes").doc(req.params.id).delete();
    res.json({ success: true, msg: "Doação deletada." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erro no servidor." });
  }
});

// =========================
// INICIAR SERVIDOR
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
