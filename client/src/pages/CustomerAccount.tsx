import { useEffect, useState } from "react";
import { ArrowLeft, Mail, MessageCircle, PackageCheck, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type CustomerProfile = { name: string; email: string; phone: string };
type CustomerOrder = {
  id: string;
  createdAt: string;
  total: number;
  paymentMethod?: "online" | "cod";
  paymentStatus?: string;
  deliveryAddress?: string;
  items: { name: string; size: string; quantity: number; price: number }[];
};

const SUPPORT_EMAIL = "amit1988rajput@gmail.com";
const SUPPORT_PHONE = "9871047488";
const SUPPORT_WHATSAPP = "919871049488";

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export default function CustomerAccount() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const adminLogout = trpc.admin.logout.useMutation();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activeSection, setActiveSection] = useState<"orders" | "support">("orders");

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("manya-customer-profile");
      if (!savedProfile) return;
      const customer = JSON.parse(savedProfile) as CustomerProfile;
      if (!customer.name || !customer.email || !customer.phone) return;
      setProfile(customer);
      const orderKey = `manya-orders-v1:${customer.email.trim().toLowerCase()}`;
      const savedOrders = JSON.parse(localStorage.getItem(orderKey) ?? "[]");
      setOrders(Array.isArray(savedOrders) ? savedOrders as CustomerOrder[] : []);
    } catch {
      setProfile(null);
      setOrders([]);
    }
  }, []);

  const logout = () => {
    adminLogout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("manya-customer-profile");
        void utils.admin.me.invalidate();
        setLocation("/");
      },
    });
  };

  return (
    <main className="customer-dashboard">
      <header className="customer-dashboard-header">
        <a className="brand-lockup" href="/">
          <span className="brand-seal">M</span>
          <span className="brand-wordmark"><span>Manya</span><small>COLLECTION</small></span>
        </a>
        <div className="customer-dashboard-actions">
          <a href="/" className="customer-back-link"><ArrowLeft size={15} /> Shop collection</a>
          {profile && <button className="customer-logout" onClick={logout} disabled={adminLogout.isPending}>Log out</button>}
        </div>
      </header>

      {!profile ? (
        <section className="customer-dashboard-empty">
          <UserRound size={25} />
          <h1>Sign in to your account</h1>
          <p>Your saved profile and order history will appear here.</p>
          <a className="customer-primary-link" href="/">Back to collection</a>
        </section>
      ) : (
        <>
          <section className="customer-profile-band">
            <div className="customer-profile-inner">
              <span className="customer-profile-eyebrow">MY ACCOUNT</span>
              <h1>{profile.name}</h1>
              <div className="customer-contact-details">
                <span><Phone size={15} /> {profile.phone}</span>
                <span><Mail size={15} /> {profile.email}</span>
              </div>
            </div>
          </section>

          <section className="customer-dashboard-content">
            <nav className="customer-dashboard-tabs" aria-label="Account sections">
              <button className={activeSection === "orders" ? "is-active" : ""} onClick={() => setActiveSection("orders")} aria-pressed={activeSection === "orders"}>
                <PackageCheck size={16} /> Orders <span>{orders.length}</span>
              </button>
              <button className={activeSection === "support" ? "is-active" : ""} onClick={() => setActiveSection("support")} aria-pressed={activeSection === "support"}>
                <MessageCircle size={16} /> Support
              </button>
            </nav>

            {activeSection === "orders" ? (
              <section className="customer-orders-section">
                <div className="customer-section-heading">
                  <div><span>YOUR PURCHASES</span><h2>Order history</h2></div>
                  <span>{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
                </div>
                {orders.length ? (
                  <div className="customer-order-list">
                    {orders.map((order) => (
                      <article className="customer-order" key={order.id}>
                        {(() => {
                          const orderStatus = order.paymentMethod === "cod"
                            ? "Unpaid · COD"
                            : order.paymentStatus?.startsWith("Paid")
                              ? "Online callback received"
                              : order.paymentStatus ?? "Payment pending";
                          return (
                            <>
                        <div className="customer-order-heading">
                          <div><span>ORDER</span><strong>{order.id}</strong></div>
                          <span className={`customer-order-status ${order.paymentMethod === "cod" ? "is-pending" : ""}`}><ShieldCheck size={14} /> {orderStatus}</span>
                        </div>
                        <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
                        <ul>
                          {order.items.map((item, index) => <li key={`${item.name}-${item.size}-${index}`}><span>{item.name} · Size {item.size} × {item.quantity}</span><span>{money(item.price * item.quantity)}</span></li>)}
                        </ul>
                        {order.deliveryAddress && <p className="customer-order-address">Deliver to: {order.deliveryAddress}</p>}
                        <div className="customer-order-total"><span>Order total</span><strong>{money(order.total)}</strong></div>
                            </>
                          );
                        })()}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="customer-orders-empty"><PackageCheck size={24} /><p>No orders yet</p><a href="/">Explore the collection <ArrowLeft size={14} /></a></div>
                )}
              </section>
            ) : (
              <section className="customer-support-section">
                <span className="customer-profile-eyebrow">WE ARE HERE TO HELP</span>
                <h2>How can we help?</h2>
                <p>Questions about sizing, delivery, or an order? Get in touch with Manya Collection.</p>
                <div className="customer-support-links">
                  <a href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hi%2C%20I%20need%20help%20with%20my%20order.`} target="_blank" rel="noreferrer"><MessageCircle size={18} /><span><strong>WhatsApp</strong><small>Chat with our team</small></span></a>
                  <a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={18} /><span><strong>Email</strong><small>{SUPPORT_EMAIL}</small></span></a>
                  <a href={`tel:+91${SUPPORT_PHONE}`}><Phone size={18} /><span><strong>Call us</strong><small>+91 {SUPPORT_PHONE}</small></span></a>
                </div>
              </section>
            )}
          </section>
        </>
      )}
    </main>
  );
}