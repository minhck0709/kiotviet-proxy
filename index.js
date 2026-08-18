const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ⚙️ THÔNG TIN KẾT NỐI KIOTVIET CỦA SHOP
const KIOTVIET_CONFIG = {
  retailer: "minhnganfreshfood",
  clientId: "88af0b7b-9741-4ba6-9532-94b2f6f1be38",
  clientSecret: "3B65B4DBD43A70BBD36897A7FA296538F906D660"
};

let cachedToken = null;
let tokenExpiredAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiredAt) return cachedToken;

  try {
    const params = new URLSearchParams();
    params.append("scopes", "PublicApi.Access");
    params.append("grant_type", "client_credentials");
    params.append("client_id", KIOTVIET_CONFIG.clientId);
    params.append("client_secret", KIOTVIET_CONFIG.clientSecret);

    const res = await axios.post("https://id.kiotviet.vn/connect/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    cachedToken = res.data.access_token;
    tokenExpiredAt = now + (res.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    console.error("Lỗi lấy Token:", err?.response?.data || err.message);
    return null;
  }
}

app.get("/api/products", async (req, res) => {
  const token = await getAccessToken();
  if (!token) return res.status(500).json({ error: "Không thể lấy Token KiotViet" });

  try {
    const response = await axios.get("https://public.kiotapi.com/products?pageSize=100", {
      headers: {
        "Retailer": KIOTVIET_CONFIG.retailer,
        "Authorization": `Bearer ${token}`
      }
    });

    const products = response.data.data.map(item => ({
      id: item.id,
      code: item.code,
      name: item.fullName || item.name,
      price: item.basePrice,
      oldPrice: item.basePrice,
      unit: item.unit || "Kg",
      image: (item.images && item.images.length > 0) ? item.images[0] : "",
      badge: item.allowsSale ? "Còn hàng" : "Hết hàng"
    }));

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ 
      error: "Lỗi kết nối dữ liệu KiotViet",
      details: err?.response?.data || err.message 
    });
  }
});

app.get("/", (req, res) => res.send("🚀 Server Proxy KiotViet đang hoạt động!"));

module.exports = app;