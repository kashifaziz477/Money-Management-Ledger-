
import { GoogleGenAI } from "@google/genai";
import { Transaction, Member } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getFinancialInsights(transactions: Transaction[], members: Member[]) {
  const summary = transactions.reduce((acc, t) => {
    if (t.type === 'INCOME') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const prompt = `
    As a financial analyst for a Pakistani organization using PKR (Rs.), analyze the following financial summary:
    - Total Members: ${members.length}
    - Total Income: Rs. ${summary.income.toLocaleString()}
    - Total Expenses: Rs. ${summary.expense.toLocaleString()}
    - Current Balance: Rs. ${(summary.income - summary.expense).toLocaleString()}
    
    Recent Transactions: ${JSON.stringify(transactions.slice(-5))}

    Provide a short, professional 2-sentence summary of the financial health in the context of a local organization or committee (kameti), and one actionable suggestion for the treasurer to optimize savings or collection in PKR.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to generate PKR insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Insights are currently unavailable.";
  }
}
