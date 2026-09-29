import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  });

  app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;

            if (!message) {
                  return res.status(400).json({
                          error: "Komut bulunamadı.",
                                });
                                    }

                                        const response = await ai.models.generateContent({
                                              model: "gemini-3.5-flash-lite",
                                                    contents: message,
                                                          config: {
                                                                  systemInstruction: `
                                                                  Sen JARVIS adında Mustafa'nın kişisel yapay zeka asistanısın.
                                                                  Her zaman Türkçe konuş.
                                                                  Doğal, zeki ve gerektiğinde ince esprili cevaplar ver.
                                                                  Cevaplarını gereksiz yere uzatma.
                                                                  Kullanıcının adı Mustafa.
                                                                  Kendini JARVIS olarak tanıt.
                                                                          `,
                                                                                },
                                                                                    });

                                                                                        res.json({
                                                                                              reply: response.text,
                                                                                                  });

                                                                                                    } catch (error) {
                                                                                                        console.error("JARVIS GEMINI ERROR:", error);

                                                                                                            res.status(500).json({
                                                                                                                  error: "Jarvis şu anda cevap veremiyor.",
                                                                                                                      });
                                                                                                                        }
                                                                                                                        });

                                                                                                                        app.listen(3001, () => {
                                                                                                                          console.log("🤖 JARVIS GEMINI CORE aktif: http://localhost:3001");
                                                                                                                          });