import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import finnhub from "finnhub";
//import db from "./src/db.js";

const port = process.env.PORT || 3001;

const app = express();

const httpServer = createServer(app);

const ioServer = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

app.get("/", (req, res, next) => {
  res.json({ ok: "ok" });
  next();
});

httpServer.listen(port);

const api_key = finnhub.ApiClient.instance.authentications["api_key"];
api_key.apiKey = process.env.FINNHUB_TOKEN;
const finnhubClient = new finnhub.DefaultApi();

var dataHandle = (socket, symbol, data, timeFrom, timeTo, insert) => {
  if (insert) {
    /*db.insertData(db.r, {
        symbol: symbol,
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        volume: data.v,
        timestamp: data.t,
      });*/
  }
  socket.emit("update", { symbol, ...data });
};

var cryptoCandles = (socket, symbol, subtractedTime, insert = true) => {
  var timeFrom = Math.floor(Date.now() / 1000) - subtractedTime;
  var timeTo = Math.floor(Date.now() / 1000);

  finnhubClient.cryptoCandles(
    symbol,
    "1",
    timeFrom,
    timeTo,
    (error, data, response) => {
      if (response.body.s == "ok") {
        dataHandle(socket, symbol, response.body, timeFrom, timeTo, insert);
      }
    }
  );
};

var stockCandles = (socket, symbol, subtractedTime, insert = true) => {
  var timeFrom = Math.floor(Date.now() / 1000) - subtractedTime;
  var timeTo = Math.floor(Date.now() / 1000);
  finnhubClient.stockCandles(
    symbol,
    "1",
    timeFrom,
    timeTo,
    {},
    (error, data, response) => {
      if (response.body.s == "ok") {
        dataHandle(socket, symbol, response.body, timeFrom, timeTo, insert);
      }
    }
  );
};

var cryptoSymbols = [
  "BINANCE:BTCUSDT",
  "BINANCE:ETHUSDT",
  "BINANCE:BNBUSDT",
  "BINANCE:BCHUSDT",
];

var stocksSymbols = ["AAPL", "MSFT", "AMZN", "GOOGL"];

global.interval = {};

var clearSymbolsIntervals = () => {
  cryptoSymbols.forEach((symbol) => {
    clearInterval(global.interval[symbol]);
  });
  stocksSymbols.forEach((symbol) => {
    clearInterval(global.interval[symbol]);
  });
};

ioServer.on("connection", (socket) => {
  socket.on("crypto", () => {
    clearSymbolsIntervals();

    cryptoSymbols.forEach((symbol) => {
      cryptoCandles(socket, symbol, 1200, false);
      global.interval[symbol] = setInterval(() => {
        cryptoCandles(socket, symbol, 60);
      }, 60000);
    });
  });

  socket.on("stocks", () => {
    clearSymbolsIntervals();

    stocksSymbols.forEach((symbol) => {
      stockCandles(socket, symbol, 1200, false);
      global.interval[symbol] = setInterval(() => {
        stockCandles(socket, symbol, 60);
      }, 60000);
    });
  });
});
