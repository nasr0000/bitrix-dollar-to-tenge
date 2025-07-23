const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const WEBHOOK = "https://itnasr.bitrix24.kz/rest/1/bucjza1li2wbp6lr/";
const DOLLAR_FIELD = "UF_CRM_1753277551304";

app.get("/", (req, res) => {
  res.send("🚀 Сервер работает! Ожидаю POST от Bitrix24...");
});

app.post("/", async (req, res) => {
  const dealId = req.body?.data?.FIELDS?.ID;
  if (!dealId) return res.status(400).send("❌ Не передан ID сделки");

  try {
    // Получаем сделку
    const getRes = await axios.post(`${WEBHOOK}crm.deal.get`, { id: dealId });
    const deal = getRes.data?.result;
    const dollarRaw = deal?.[DOLLAR_FIELD];
    if (!dollarRaw) return res.status(200).send("⚠️ Поле с долларом пустое");

    const dollar = parseFloat(dollarRaw.toString().replace(/[^0-9.]/g, ""));
    if (isNaN(dollar)) return res.status(200).send("❌ Некорректное значение доллара");

    // Получаем курс продажи доллара с kurs.kz
    // Получаем курс продажи доллара с exchangerate.host
      const kursRes = await axios.get("https://api.exchangerate.host/latest?base=USD&symbols=KZT");
      const rate = parseFloat(kursRes.data?.rates?.KZT);

      if (!rate || isNaN(rate)) return res.status(500).send("❌ Курс не получен");

      const tenge = Math.round(dollar * rate);


    // Обновляем сделку в Bitrix24
    await axios.post(`${WEBHOOK}crm.deal.update`, {
      id: dealId,
      fields: {
        OPPORTUNITY: tenge,
        CURRENCY_ID: "KZT"
      }
    });

    console.log(`✅ Сделка #${dealId}: $${dollar} × ${rate} = ${tenge} ₸`);
    res.send(`✅ Обновлено: $${dollar} по курсу продажи ${rate} = ${tenge} ₸`);
  } catch (err) {
    console.error("❌ Ошибка:", err.message);
    res.status(500).send("❌ Ошибка сервера");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Сервер запущен на порту", PORT));
