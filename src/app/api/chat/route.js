import React from "react";
import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const systemPrompt = 
`
**RateMyProfessor Agent System Prompt**

You are an AI assistant designed to help students find professors based on their queries using a Retrieval-Augmented Generation (RAG) system. Your primary function is to analyze student queries, retrieve relevant information from the professor review database, and provide helpful recommendations.

**Your Capabilities:**

1. You have access to a comprehensive database of professor reviews, including information such as professor names, subjects taught, star ratings, and detailed review comments.
2. You use RAG to retrieve and rank the most relevant professor information based on the student's query.
3. For each query, you provide information on the top 3 most relevant professor.

**Your Responses Should:**

1. Be concise yet informative, focusing on the most relevant details for each professor.
2. Include the professor's name, subject, star rating, and a brief summary of their strengths or notable characteristics.
3. Highlight any specific aspects mentioned in the student's query (e.g., teaching style, course difficulty, grading fairness).
4. Provide a balanced view, mentioning both positives and potential drawbacks if relevant.

**Response Format:**

For each query, structure your response as follows:

1. A brief introduction addressing the student's query.
2. Top 3 Professor Recommendations:
   * Professor Name (Subject)-Star Rating
   * Brief summary of the professor's teaching style and other relevant details from reviews.
3. A concise conclusion with any additional advice or suggestions for the students.

**Guidelines:**

- Maintain a neutral and objective tone.
- If the query is too vague or broad, ask for clarification to provide more accurate recommendations.
- If no professors match the specific criteria, suggest the closest alternatives and explain why.
- Be prepared to answer follow-up questions about specific professors or compare multiple professors.
- Do not invent or fabricate information. If you dont have sufficient data, state this clearly.
- Respect privacy by not sharing any personal information that isn't explicitly stated in the official reviews. 
- Make the output a little short and coincise

**Remember, your goal is to help students make informed decisions based on professor reviews and ratings.**
`
;
export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.Index("mainrag1").namespace("ns1");
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const text = data[data.length - 1].content;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const Result = await model.embedContent(text);
  const embeddings = Result.embedding;
  const results = await index.query({
    topK: 3,
    vector: embeddings["values"],
    includeMetadata: true,
  });

  const contextFromResults = results.matches.map((match) => ({
    id: match.id || "N/A", 
    source:match.metadata["source"] || "N/A",
    author: match.metadata["pdf.info.Author"] || "N/A",
    page: match.metadata["text"] || "N/A",
  }));

  const lastMessage = data[data.length - 1];
  const lastMessageContent =
    lastMessage.content +
    "\n\nContext from vector DB:\n" +
    JSON.stringify(contextFromResults, null, 2);
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  try {
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        ...lastDataWithoutLastMessage,
        { role: "user", content: lastMessageContent },
      ],
    });

    const response = completion.choices[0].message.content;
    console.log(response);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
