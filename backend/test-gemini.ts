import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} } as any],
  });

  try {
    const result = await model.generateContent("Hello world");
    console.log("SUCCESS");
    console.log(result.response.text());
  } catch (err: any) {
    console.error("ERROR:");
    console.error(err.message);
  }
}
run();
