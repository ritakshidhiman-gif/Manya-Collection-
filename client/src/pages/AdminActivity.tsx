import { useMemo } from "react";
import { Activity, ArrowLeft, Banknote, CircleAlert, Download, Mail, PackageCheck, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const money = (amount: number | null) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount ?? 0);

const eventLabel: Record<string, string> = {
  customer_login: "Customer signed in",
  admin_login: "Admin signed in",
  checkout_started: "Started checkout",
  checkout_details_entered: "Entered checkout details",
  cod_order_requested: "COD order requested",
  payment_succeeded: "Payment success callback",
  payment_failed: "Payment failed",
  payment_cancelled: "Payment cancelled",
};

export default function AdminActivity() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: adminSession, isLoading: checkingAdmin } = trpc.admin.me.useQuery();
  const { data: events = [], isLoading, error, refetch } = trpc.activity.recent.useQuery(undefined, {
    enabled: adminSession?.isAdmin === true,
    refetchInterval: 15_000,
  });
  const adminLogout = trpc.admin.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("manya-customer-profile");
      void utils.admin.me.invalidate();
      setLocation("/");
    },
  });

  const checkoutEvents = useMemo(() => events.filter((event) => event.eventType === "checkout_started"), [events]);
  const abandonedCount = checkoutEvents.filter((checkout) => {
    const hasOutcome = events.some((event) => event.checkoutId === checkout.checkoutId && ["payment_succeeded", "payment_failed", "payment_cancelled"].includes(event.eventType));
    return !hasOutcome && Date.now() - new Date(checkout.createdAt).getTime() >= 20 * 60 * 1000;
  }).length;
  const identifiedCustomers = new Set(events.filter((event) => event.customerEmail).map((event) => event.customerEmail?.toLowerCase())).size;
  const signInCount = events.filter((event) => event.eventType === "customer_login" || event.eventType === "admin_login").length;
  const reportedPayments = events.filter((event) => event.eventType === "payment_succeeded").length;
  const codOrders = events.filter((event) => event.eventType === "cod_order_requested").length;

  const downloadActivity = () => {
    const csvCell = (value: unknown) => {
      const text = String(value ?? "");
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const header = ["Event", "Name", "Email", "Phone", "Delivery address", "Payment method", "Amount INR", "Payment status", "Payment ID", "Date"];
    const rows = events.map((event) => [
      eventLabel[event.eventType] ?? event.eventType,
      event.customerName,
      event.customerEmail,
      event.customerPhone,
      event.deliveryAddress,
      event.paymentMethod?.toUpperCase(),
      event.amount,
      event.eventType === "cod_order_requested" ? "UNPAID - COD" : event.eventType === "payment_succeeded" ? "PAID CALLBACK" : event.eventType,
      event.paymentId,
      new Date(event.createdAt).toLocaleString("en-IN"),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `manya-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  if (checkingAdmin) return <main className="admin-activity-page"><p>Checking admin access...</p></main>;
  if (!adminSession?.isAdmin) {
    return <main className="admin-activity-page"><h1>Admin access required</h1><button className="admin-page-back" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Back to collection</button></main>;
  }

  return (
    <main className="admin-activity-page">
      <header className="admin-activity-header">
        <button className="admin-page-back" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Storefront</button>
        <div className="admin-activity-header-actions">
          <button className="admin-page-back" onClick={() => setLocation("/admin/products/add")}><PackageCheck size={15} /> Add suit</button>
          <button className="admin-page-back" onClick={downloadActivity} disabled={events.length === 0} aria-label="Download activity CSV"><Download size={15} /> Download activity</button>
          <button className="admin-page-back" onClick={() => adminLogout.mutate(undefined)} disabled={adminLogout.isPending}>Log out</button>
        </div>
        <span className="eyebrow">MANYA COLLECTION · ADMIN</span>
        <h1><Activity size={25} /> Store activity</h1>
        <p>Signed-in customer details, delivery information, payment choices, and order attempts.</p>
      </header>

      <section className="admin-activity-stats" aria-label="Store activity summary">
        <article><UserRound size={17} /><span>Identified customers</span><strong>{identifiedCustomers}</strong></article>
        <article><Activity size={17} /><span>Account sign-ins</span><strong>{signInCount}</strong></article>
        <article><PackageCheck size={17} /><span>Checkout starts</span><strong>{checkoutEvents.length}</strong></article>
        <article><CircleAlert size={17} /><span>Abandoned checkouts</span><strong>{abandonedCount}</strong></article>
        <article><ShieldCheck size={17} /><span>Success callbacks</span><strong>{reportedPayments}</strong></article>
        <article><Banknote size={17} /><span>COD orders</span><strong>{codOrders}</strong></article>
      </section>

      <section className="admin-activity-list-section">
        <div className="admin-activity-list-heading">
          <div><span>LIVE FEED</span><h2>Recent activity</h2></div>
          <button onClick={() => void refetch()} aria-label="Refresh activity"><RefreshCw size={15} /> Refresh</button>
        </div>
        {isLoading ? <p className="admin-activity-message">Loading activity...</p> : error ? <p className="admin-activity-message">Activity is unavailable. Confirm the database migration has been applied.</p> : events.length === 0 ? <p className="admin-activity-message">No activity recorded yet.</p> : (
          <div className="admin-activity-table-wrap">
            <table className="admin-activity-table">
              <thead><tr><th>Event</th><th>Customer</th><th>Checkout</th><th>Time</th></tr></thead>
              <tbody>
                {events.map((event) => {
                  const checkoutStart = event.eventType === "checkout_started";
                  const outcome = event.checkoutId ? events.find((item) => item.checkoutId === event.checkoutId && ["cod_order_requested", "payment_succeeded", "payment_failed", "payment_cancelled"].includes(item.eventType)) : undefined;
                  const isAbandoned = checkoutStart && !outcome && Date.now() - new Date(event.createdAt).getTime() >= 20 * 60 * 1000;
                  const checkoutStatus = isAbandoned ? "Abandoned" : outcome ? eventLabel[outcome.eventType] : "Awaiting payment";
                  return (
                    <tr key={event.id}>
                      <td><strong>{eventLabel[event.eventType] ?? event.eventType}</strong>{event.amount != null && <small>{money(event.amount)}</small>}</td>
                      <td>{event.customerName || "Signed-in customer"}{event.customerEmail && <small><Mail size={11} /> {event.customerEmail}</small>}{event.customerPhone && <small>{event.customerPhone}</small>}{event.deliveryAddress && <small>{event.deliveryAddress}</small>}</td>
                      <td>{event.paymentMethod && <small>{event.paymentMethod.toUpperCase()}</small>}{checkoutStart ? <span className={`activity-status ${isAbandoned ? "is-abandoned" : outcome?.eventType === "payment_succeeded" || outcome?.eventType === "cod_order_requested" ? "is-complete" : ""}`}>{checkoutStatus}</span> : event.paymentId ? <small>{event.paymentId}</small> : <small>{event.eventType === "cod_order_requested" ? "Unpaid - COD" : event.eventType === "payment_succeeded" ? "Paid callback" : "Customer activity"}</small>}</td>
                      <td><time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="admin-activity-note">Only signed-in customer activity is saved here. Online payment success is a browser callback and is not server-verified.</p>
      </section>
    </main>
  );
}