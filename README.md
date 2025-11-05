# 🎬 Gerador Diário de Ideias de Roteiros

Aplicação web simples feita em **React + Vite + Tailwind**, que gera **roteiros diários inspiracionais** (com ganchos, CTAs, visuais e trilhas) a partir de textos extraídos de PDFs — com **leitura automática**, **OCR integrado** e **exportação CSV/JSON**.

---

## 🚀 Funcionalidades

✅ Leitura automática de PDFs com **PDF.js**
✅ Fallback de **OCR (Tesseract.js)** para PDFs escaneados
✅ Interface leve e responsiva com TailwindCSS
✅ Geração de ideias diárias (baseadas em data, idioma e corpus)
✅ Exportação em **CSV**, **JSON** e **Copiar texto**
✅ Salvamento local (localStorage) dos roteiros e versículos
✅ 100% client-side (sem backend) — seguro e gratuito

---

## 🧠 Como funciona

1. Você faz upload de um PDF com textos ou orações.
2. O app extrai o conteúdo (ou usa OCR se for imagem).
3. Gera **n** ideias diárias, únicas para a data escolhida.
4. Cada ideia traz:

   * 🎯 Título e gancho
   * 💬 Frase de impacto (mensagem central)
   * 🕊️ Desenvolvimento com CTA, trilha e visual sugerido
   * 📖 Verso opcional

---

## 🧩 Tecnologias usadas

* [React](https://react.dev/)
* [Vite](https://vitejs.dev/)
* [TailwindCSS](https://tailwindcss.com/)
* [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist)
* [tesseract.js](https://www.npmjs.com/package/tesseract.js)

---

## 💻 Instalação local

```bash
# 1. Clone o repositório
git clone https://github.com/seuusuario/roteiro-gen.git
cd roteiro-gen

# 2. Instale as dependências
npm install

# 3. Rode localmente
npm run dev
```

O app abrirá em `http://localhost:5173`

---

## 🌐 Deploy na Vercel

1. Faça login em [vercel.com](https://vercel.com)
2. Crie um novo projeto e conecte o repositório GitHub
3. A Vercel detectará o framework **Vite** automaticamente
4. Clique em **Deploy**
5. Acesse: `https://seuprojeto.vercel.app`

---

## ⚙️ Estrutura de pastas

```
roteiro-gen/
├── public/
│   └── favicon.ico
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 📁 Scripts principais

| Comando           | Descrição                  |
| ----------------- | -------------------------- |
| `npm run dev`     | Inicia o servidor local    |
| `npm run build`   | Cria build otimizada       |
| `npm run preview` | Visualiza build localmente |

---

## 🧾 Licença

© 2025 — Feito por Gean Filho.

Sinta-se livre para usar, modificar e compartilhar.
