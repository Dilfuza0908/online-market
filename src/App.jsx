import { useState, useEffect } from "react";
import "./styles.css";
import { load, save } from "./storage";
import { getBook, shipping } from "./utils";
import useHash from "./hooks/useHash";
import Header from "./components/Header";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Register from "./pages/Register";
import Login from "./pages/Login";
import MyOrders from "./pages/MyOrders";

const PAGES = ["bosh", "savat", "kirish", "royxat", "buyurtmalarim"];
const digits = (s) => s.replace(/\D/g, "");
const go = (hash) => { location.hash = hash; };

export default function App() {
  const hash = useHash();
  const [cart, setCart] = useState({});                       // { kitobId: miqdor }
  const [users, setUsers] = useState(() => load("kx_users", []));
  const [session, setSession] = useState(() => load("kx_session", null)); // telefon raqami
  const [orders, setOrders] = useState(() => load("kx_orders", []));
  const [toast, setToast] = useState("");

  useEffect(() => save("kx_users", users), [users]);
  useEffect(() => save("kx_session", session), [session]);
  useEffect(() => save("kx_orders", orders), [orders]);

  const user = users.find((u) => u.phone === session) || null;
  const myOrders = orders.filter((o) => o.phone === session).sort((a, b) => b.id - a.id);
  const total = Object.entries(cart).reduce((a, [id, q]) => a + getBook(+id).p * q, 0);
  const count = Object.values(cart).reduce((a, q) => a + q, 0);

  const say = (t) => { setToast(t); setTimeout(() => setToast(""), 1800); };

  const change = (id, d) =>
    setCart((c) => {
      const q = (c[id] || 0) + d;
      const { [id]: _removed, ...rest } = c;
      return q > 0 ? { ...rest, [id]: q } : rest;
    });
  const add = (id) => { change(id, 1); say(`«${getBook(id).t}» savatga qo'shildi`); };

  // Xato bo'lsa matn qaytaradi, muvaffaqiyatli bo'lsa hech narsa qaytarmaydi
  const register = (f) => {
    const phone = digits(f.phone);
    if (users.some((u) => u.phone === phone)) return "Bu raqam bilan hisob allaqachon bor. Kirishni sinab ko'ring.";
    setUsers([...users, { name: f.name.trim(), phone, pass: f.pass }]);
    setSession(phone);
    go(count ? "savat" : "bosh");
  };
  const login = (f) => {
    const u = users.find((x) => x.phone === digits(f.phone) && x.pass === f.pass);
    if (!u) return "Telefon raqami yoki parol noto'g'ri.";
    setSession(u.phone);
    go(count ? "savat" : "bosh");
  };
  const logout = () => { setSession(null); go("bosh"); };

  const place = (f) => {
    const id = orders.reduce((m, o) => Math.max(m, o.id), 1000) + 1;
    const items = Object.entries(cart).map(([i, q]) => ({ id: +i, t: getBook(+i).t, p: getBook(+i).p, q }));
    setOrders([...orders, {
      id, phone: session, items, sum: total + shipping(total),
      addr: f.addr.trim(), pay: f.pay, st: 0, date: new Date().toLocaleString("ru-RU").slice(0, 16),
    }]);
    setCart({});
    say("Buyurtma qabul qilindi");
    go("buyurtmalarim");
  };
  const advance = (id) =>
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, st: Math.min(o.st + 1, 2) } : o)));

  const m = /^k(\d+)$/.exec(hash);
  const page = m ? "bosh" : PAGES.includes(hash) ? hash : "bosh";

  let view;
  if (m) view = <Product id={+m[1]} cart={cart} change={change} onAdd={add} />;
  else if (page === "savat") view = <Cart cart={cart} change={change} total={total} user={user} onPlace={place} />;
  else if (page === "royxat") view = <Register onRegister={register} />;
  else if (page === "kirish") view = <Login onLogin={login} />;
  else if (page === "buyurtmalarim")
    view = user ? <MyOrders orders={myOrders} advance={advance} />
      : <Login onLogin={login} notice="Buyurtmalaringizni ko'rish uchun avval kiring." />;
  else view = <Home onAdd={add} user={user} />;

  return (
    <>
      <Header page={page} count={count} user={user} onLogout={logout} />
      <main>{view}</main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}