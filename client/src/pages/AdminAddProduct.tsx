import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Plus, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const CATEGORIES = ["Everyday", "Festive", "Occasion wear", "Designer suits"];

export default function AdminAddProduct() {
  const [, setLocation] = useLocation();
  const { data: adminSession, isLoading } = trpc.admin.me.useQuery();
  const utils = trpc.useUtils();
  const saveProduct = trpc.catalog.save.useMutation();
  const [form, setForm] = useState({
    name: "",
    price: "",
    fabric: "",
    color: "",
    category: CATEGORIES[0] ?? "Everyday",
    image: "",
    sizes: ["S", "M", "L", "XL"],
    description: "",
    inStock: true,
  });
  const [error, setError] = useState("");

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm((current) => ({ ...current, image: String(reader.result ?? "") }));
      reader.onerror = () => setError("Could not read that photo. Please try another image.");
      reader.readAsDataURL(file);
    }
    event.currentTarget.value = "";
  };

  const toggleSize = (size: string) => {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.includes(size)
        ? current.sizes.filter((item) => item !== size)
        : [...current.sizes, size],
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const price = Number(form.price);
    if (!Number.isSafeInteger(price) || price < 1) {
      setError("Enter a valid price in INR.");
      return;
    }
    if (!form.image.trim()) {
      setError("Add a product photo using the gallery, camera, or image URL.");
      return;
    }
    if (!form.sizes.length) {
      setError("Select at least one available size.");
      return;
    }

    saveProduct.mutate({
      id: `manya-${crypto.randomUUID()}`,
      name: form.name.trim(),
      price,
      fabric: form.fabric.trim(),
      color: form.color.trim(),
      category: form.category,
      image: form.image.trim(),
      sizes: form.sizes,
      description: form.description.trim(),
      badge: "New arrival",
      inStock: form.inStock,
    }, {
      onSuccess: async () => {
        await utils.catalog.list.invalidate();
        setLocation("/");
        window.setTimeout(() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }), 120);
      },
      onError: () => setError("Could not publish the suit. Please check your connection and try again."),
    });
  };

  if (isLoading) return <main className="admin-product-page"><p>Checking admin access...</p></main>;
  if (!adminSession?.isAdmin) {
    return (
      <main className="admin-product-page">
        <button className="admin-page-back" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Back to collection</button>
        <h1>Admin access required</h1>
        <p>Please sign in with an approved admin account to add products.</p>
      </main>
    );
  }

  return (
    <main className="admin-product-page">
      <header className="admin-product-header">
        <button className="admin-page-back" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Back to collection</button>
        <span className="eyebrow">MANYA COLLECTION · ADMIN</span>
        <h1>Add a suit</h1>
        <p>Product details are published to the shared collection. Uploaded photos are saved with the product.</p>
      </header>

      <form className="admin-product-form" onSubmit={submit}>
        <div className="admin-product-fields">
          <label>Suit name<input required maxLength={240} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Price (INR)<input required type="number" min="1" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
          <label>Fabric<input required maxLength={120} placeholder="Pure cotton, silk blend..." value={form.fabric} onChange={(event) => setForm({ ...form, fabric: event.target.value })} /></label>
          <label>Color<input required maxLength={120} placeholder="Rosewood, sage..." value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
          <label>Collection<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <fieldset className="admin-size-picker">
            <legend>Available sizes</legend>
            {SIZE_OPTIONS.map((size) => (
              <label key={size}><input type="checkbox" checked={form.sizes.includes(size)} onChange={() => toggleSize(size)} />{size}</label>
            ))}
          </fieldset>
        </div>

        <section className="admin-image-section" aria-label="Product photo">
          <div className="admin-image-heading"><ImagePlus size={17} /><h2>Product photo</h2></div>
          <label className="admin-image-url">Image URL<input type="url" placeholder="https://..." value={form.image.startsWith("data:") ? "" : form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label>
          <div className="admin-image-actions">
            <label className="admin-image-action"><Upload size={16} /> Choose from gallery<input type="file" accept="image/*" onChange={chooseImage} /></label>
            <label className="admin-image-action"><ImagePlus size={16} /> Take a photo<input type="file" accept="image/*" capture="environment" onChange={chooseImage} /></label>
          </div>
          {form.image && <img className="admin-image-preview" src={form.image} alt="Product preview" />}
          <p className="admin-image-note">An uploaded photo is copied into the product record. Removing the original from your device will not remove it here.</p>
        </section>

        <label className="admin-description-field">Description<textarea rows={4} maxLength={6000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="admin-stock-toggle"><input type="checkbox" checked={form.inStock} onChange={(event) => setForm({ ...form, inStock: event.target.checked })} /> Available to order</label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <button className="button button--wine admin-publish-button" type="submit" disabled={saveProduct.isPending}><Plus size={16} /> {saveProduct.isPending ? "Publishing..." : "Publish suit"}</button>
      </form>
    </main>
  );
}
