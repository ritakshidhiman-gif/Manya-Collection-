// React is provided by the client runtime; keep this page buildable when its
// optional type declarations are not available to the editor.
import { useEffect, useMemo, useState } from "react";
import { isAllowedAdminIdentity } from "../../../shared/admin";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Download,
  Edit,
  Heart,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Product = {
  id: string;
  name: string;
  price: number;
  fabric: string;
  color: string;
  category: string;
  image: string;
  sizes: string[];
  description: string;
  badge?: string;
  inStock: boolean;
};

type CartLine = { productId: string; size: string; quantity: number };
type ModalName = "cart" | "checkout" | "admin" | "editProduct" | "search" | "contact" | "account" | null;
type StoreEventType = "customer_login" | "admin_login" | "checkout_started" | "checkout_details_entered" | "cod_order_requested" | "payment_succeeded" | "payment_failed" | "payment_cancelled";
type StoreActivityPayload = {
  eventType: StoreEventType;
  path: string;
  checkoutId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  paymentMethod?: "online" | "cod" | null;
  amount?: number | null;
  paymentId?: string | null;
};

const SIZES = ["S", "M", "L", "XL", "XXL"];
const SIZE_OPTIONS = ["XS", ...SIZES, "3XL"];
const WHATSAPP_LINK = "https://wa.me/919871049488?text=Hi";
const PRODUCT_IMAGES = [  
  "/manya-product-cotton-2.png",
  "/manya-product-farsi.png",
  "/manya-product-silk-2.png",
  "/manya-cotton-hero-2.png",
];

const STARTER_PRODUCTS: Product[] = [
  {
    id: "gulnaar-cotton",
    name: "Gulnaar Cotton Suit",
    price: 2890,
    fabric: "Pure cotton",
    color: "Sage",
    category: "Everyday",
    image: PRODUCT_IMAGES[1],
    sizes: SIZES,
    description: "A light, easy-going cotton suit with delicate white threadwork and an airy dupatta.",
    badge: "Bestseller",
    inStock: true,
  },
  {
    id: "noor-farshi",
    name: "Noor Farshi Set",
    price: 4890,
    fabric: "Chiffon blend",
    color: "Rosewood",
    category: "Festive",
    image: PRODUCT_IMAGES[2],
    sizes: SIZES,
    description: "A graceful farshi silhouette with fine embroidery.",
    badge: "New arrival",
    inStock: true,
  },
  {
    id: "meher-silk",
    name: "Meher Silk Edit",
    price: 6290,
    fabric: "Art silk",
    color: "Plum",
    category: "Occasion wear",
    image: PRODUCT_IMAGES[3],
    sizes: SIZES,
    description: "A jewel-toned occasion suit with antique-inspired embroidery.",
    badge: "Limited edit",
    inStock: true,
  },
  {
    id: "gul-e-noor",
    name: "Gul-e-Noor Embroidered Suit",
    price: 5590,
    fabric: "Organza blend",
    color: "Deep wine",
    category: "Designer suits",
    image: PRODUCT_IMAGES[0],
    sizes: SIZES,
    description: "A romantic wine-coloured embroidered suit with a light drape.",
    inStock: true,
  },
];
const STARTER_PRODUCT_IDS = new Set(STARTER_PRODUCTS.map((product) => product.id));

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const createActivityId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const getCustomerActivityId = (email: string) => {
  try {
    const storageKey = `manya-customer-activity-id:${email.trim().toLowerCase()}`;
    const savedId = localStorage.getItem(storageKey);
    if (savedId) return savedId;
    const customerId = createActivityId();
    localStorage.setItem(storageKey, customerId);
    return customerId;
  } catch {
    return createActivityId();
  }
};

const getLocalProductImage = (image: string | undefined) => {
  const source = (image ?? "").toLowerCase();
  if (source.includes("farsi")) return PRODUCT_IMAGES[1];
  if (source.includes("silk")) return PRODUCT_IMAGES[2];
  if (source.includes("hero")) return PRODUCT_IMAGES[3];
  return PRODUCT_IMAGES[0];
};

const handleProductImageError = (event: React.SyntheticEvent<HTMLImageElement>, image: string) => {
  const fallback = getLocalProductImage(image);
  if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
};

export default function Home() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: adminSession } = trpc.admin.me.useQuery();
  const { data: sharedCatalog } = trpc.catalog.list.useQuery(undefined, { refetchInterval: 15_000 });
  const saveCatalogMutation = trpc.catalog.save.useMutation();
  const deleteCatalogMutation = trpc.catalog.delete.useMutation();
  const adminLogin = trpc.admin.login.useMutation();
  const adminLogout = trpc.admin.logout.useMutation();
  const trackActivityMutation = trpc.activity.track.useMutation();
  const [customerMode, setCustomerMode] = useState(false);
  const isAdmin = !customerMode && adminSession?.isAdmin === true;
  const recordActivity = (event: StoreActivityPayload) => {
    const hasCustomerDetails = Boolean(event.customerName && event.customerEmail && event.customerPhone);
    const isLoginEvent = event.eventType === "customer_login" || event.eventType === "admin_login";
    if (!isLoginEvent && (isAdmin || (!displayName && !hasCustomerDetails))) return Promise.resolve(false);
    return trackActivityMutation.mutateAsync({
      id: createActivityId(),
      visitorId: getCustomerActivityId(event.customerEmail ?? contactForm.email),
      ...event,
    }).then(() => true, () => false);
  };

  const [products, setProducts] = useState<Product[]>(STARTER_PRODUCTS);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalName>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  
  const [filter, setFilter] = useState("All pieces");
  const [fabric, setFabric] = useState("All fabrics");
  const [colour, setColour] = useState("All colours");
  const [sort, setSort] = useState("Featured");
  const [query, setQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });
  const [deliveryAddress, setDeliveryAddress] = useState({ street: "", landmark: "", city: "", state: "", pincode: "" });
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [displayName, setDisplayName] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [adminChallengeVisible, setAdminChallengeVisible] = useState(false);
  const [adminPhrase, setAdminPhrase] = useState("");
  const [adminPin, setAdminPin] = useState("");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adminForm, setAdminForm] = useState<{
    name: string;
    price: string;
    fabric: string;
    color: string;
    category: string;
    image: string;
    sizes: string[];
    description: string;
    inStock: boolean;
  }>({
    name: "",
    price: "",
    fabric: "Pure cotton",
    color: "",
    category: "Everyday",
    image: PRODUCT_IMAGES[0],
    sizes: SIZES,
    description: "",
    inStock: true,
  });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCheckoutId, setActiveCheckoutId] = useState("");

  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem("manya-inventory-v1");
      const savedCart = localStorage.getItem("manya-cart-v1");
      const savedFavorites = localStorage.getItem("manya-favorites-v1");
      const savedProfile = localStorage.getItem("manya-customer-profile");
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts) as Product[];
        if (Array.isArray(parsed) && parsed.length) setProducts(parsed);
      }
      if (savedCart) setCart(JSON.parse(savedCart) as CartLine[]);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites) as string[]);
      if (savedProfile) {
        const profile = JSON.parse(savedProfile) as { name?: string; phone?: string; email?: string };
        if (profile.name && profile.email && profile.phone) {
          setContactForm({ name: profile.name, email: profile.email, phone: profile.phone });
          setDisplayName(profile.name);
        }
      }
      const savedAddress = localStorage.getItem("manya-customer-delivery-v1");
      if (savedAddress) setDeliveryAddress(JSON.parse(savedAddress));
    } catch {
      // Ignore local storage parse errors
    }
    setInventoryReady(true);
  }, []);

  useEffect(() => {
    if (!sharedCatalog) return;
    const sharedProducts = sharedCatalog as Product[];
    const sharedIds = new Set(sharedProducts.map((product) => product.id));
    let previouslySharedIds = new Set<string>();
    try {
      const savedSharedIds = JSON.parse(localStorage.getItem("manya-shared-catalog-ids") ?? "[]") as string[];
      previouslySharedIds = new Set(savedSharedIds);
      localStorage.setItem("manya-shared-catalog-ids", JSON.stringify([...sharedIds]));
    } catch {
      // Ignore local storage errors and keep the server catalog authoritative.
    }
    setProducts((current) => [
      ...sharedProducts,
      ...current.filter((product) =>
        STARTER_PRODUCT_IDS.has(product.id) &&
        !sharedIds.has(product.id) &&
        !previouslySharedIds.has(product.id)
      ),
    ]);
  }, [sharedCatalog]);

  useEffect(() => {
    if (!inventoryReady) return;
    localStorage.setItem("manya-inventory-v1", JSON.stringify(products));
    localStorage.setItem("manya-cart-v1", JSON.stringify(cart));
    localStorage.setItem("manya-favorites-v1", JSON.stringify(favorites));
  }, [products, cart, favorites, inventoryReady]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminForm((prev: typeof adminForm) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((product: Product) => {
      const matchesCategory = filter === "All pieces" || product.category === filter;
      const matchesFabric = fabric === "All fabrics" || product.fabric.toLowerCase().includes(fabric.toLowerCase());
      const matchesColour = colour === "All colours" || product.color === colour;
      const matchesSearch = !query.trim() || `${product.name} ${product.fabric} ${product.color} ${product.category}`.toLowerCase().includes(query.toLowerCase());
      const matchesFavorites = !favouritesOnly || favorites.includes(product.id);
      return matchesCategory && matchesFabric && matchesColour && matchesSearch && matchesFavorites;
    });
    if (sort === "Price: low to high") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") result = [...result].sort((a, b) => b.price - a.price);
    if (sort === "Name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, filter, fabric, colour, sort, query, favouritesOnly, favorites]);

  const searchResults = query.trim()
    ? products.filter((product: Product) =>
        `${product.name} ${product.fabric} ${product.color} ${product.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : [];

  const cartCount = cart.reduce((total: number, line: CartLine) => total + line.quantity, 0);
  const cartTotal = cart.reduce((total: number, line: CartLine) => {
    const product = products.find((item: Product) => item.id === line.productId);
    return total + (product?.price ?? 0) * line.quantity;
  }, 0);

  const openProduct = (product: Product) => {
    setActiveProduct(product);
    setSelectedSize("");
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((current: string[]) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const addToCart = (product: Product, size: string) => {
    if (!size || !product.inStock) return;
    setCart((current: CartLine[]) => {
      const found = current.find((line) => line.productId === product.id && line.size === size);
      return found
        ? current.map((line) => line === found ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { productId: product.id, size, quantity: 1 }];
    });
    setActiveProduct(null);
    setModal("cart");
  };

  const updateQuantity = (productId: string, size: string, delta: number) => {
    setCart((current: CartLine[]) => current
      .map((line) => line.productId === productId && line.size === size ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  };

  const beginCheckout = () => {
    if (!cart.length) return;
    const checkoutId = createActivityId();
    setActiveCheckoutId(checkoutId);
    recordActivity({
      eventType: "checkout_started",
      path: window.location.pathname,
      checkoutId,
      customerName: contactForm.name.trim() || null,
      customerEmail: contactForm.email.trim().toLowerCase() || null,
      customerPhone: contactForm.phone.trim() || null,
      amount: cartTotal,
    });
    setModal("checkout");
  };

  const submitCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const checkoutId = activeCheckoutId || createActivityId();
    setActiveCheckoutId(checkoutId);
    const addressText = [deliveryAddress.street.trim(), deliveryAddress.landmark.trim(), deliveryAddress.city.trim(), deliveryAddress.state.trim(), deliveryAddress.pincode.trim()].filter(Boolean).join(", ");
    const items = cart.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return {
        name: product?.name ?? "Manya Collection item",
        size: line.size,
        quantity: line.quantity,
        price: product?.price ?? 0,
      };
    });
    const saveLocalOrder = (id: string, paymentStatus: string) => {
      const order = {
        id,
        createdAt: new Date().toISOString(),
        total: cartTotal,
        paymentMethod,
        paymentStatus,
        deliveryAddress: addressText,
        items,
      };
      try {
        const orderKey = `manya-orders-v1:${contactForm.email.trim().toLowerCase()}`;
        const savedOrders = JSON.parse(localStorage.getItem(orderKey) ?? "[]");
        localStorage.setItem(orderKey, JSON.stringify([order, ...(Array.isArray(savedOrders) ? savedOrders : [])]));
      } catch {
        // Keep checkout completion working if local order history cannot be saved.
      }
    };

    try {
      localStorage.setItem("manya-customer-delivery-v1", JSON.stringify(deliveryAddress));
    } catch {}

    if (paymentMethod === "cod") {
      const activitySaved = await recordActivity({
        eventType: "cod_order_requested",
        path: window.location.pathname,
        checkoutId,
        customerName: contactForm.name.trim(),
        customerEmail: contactForm.email.trim().toLowerCase(),
        customerPhone: contactForm.phone.trim(),
        deliveryAddress: addressText,
        paymentMethod,
        amount: cartTotal,
      });
      if (!activitySaved) {
        alert("We could not save your order details. Please try again.");
        return;
      }
      const orderId = `COD-${Date.now()}`;
      saveLocalOrder(orderId, "Unpaid - Cash on Delivery");
      setCart([]);
      setModal(null);
      setActiveCheckoutId("");
      window.alert("COD order submitted. Manya Collection has received your delivery and order details.");
      return;
    }

    if (typeof (window as any).Razorpay === "undefined") {
      alert("Razorpay SDK load nahi hua hai. Kripya page refresh karein.");
      return;
    }

    const detailsSaved = await recordActivity({
      eventType: "checkout_details_entered",
      path: window.location.pathname,
      checkoutId,
      customerName: contactForm.name.trim() || null,
      customerEmail: contactForm.email.trim().toLowerCase() || null,
      customerPhone: contactForm.phone.trim() || null,
      deliveryAddress: addressText,
      paymentMethod,
      amount: cartTotal,
    });
    if (!detailsSaved) {
      alert("We could not save your delivery details. Please try again.");
      return;
    }

    const options = {
      key: (import.meta as unknown as { env?: { VITE_RAZORPAY_KEY_ID?: string } }).env?.VITE_RAZORPAY_KEY_ID || "rzp_live_Tfvw2yC2pJRTol",
      amount: cartTotal * 100,
      currency: "INR",
      name: "Manya Collection",
      description: "Order Payment",
      handler: function (response: any) {
        const activitySaved = recordActivity({
          eventType: "payment_succeeded",
          path: window.location.pathname,
          checkoutId,
          customerName: contactForm.name.trim() || null,
          customerEmail: contactForm.email.trim().toLowerCase() || null,
          customerPhone: contactForm.phone.trim() || null,
          deliveryAddress: addressText,
          paymentMethod,
          amount: cartTotal,
          paymentId: response.razorpay_payment_id,
        });
        saveLocalOrder(response.razorpay_payment_id, "Paid - Razorpay callback");
        setCart([]);
        setModal(null);
        setActiveCheckoutId("");
        void activitySaved.then((saved) => window.alert(saved
          ? `Payment response received. Order details sent to Manya Collection. Payment ID: ${response.razorpay_payment_id}`
          : `Payment response received, but order details could not be saved. Contact Manya Collection with payment ID: ${response.razorpay_payment_id}`));
      },
      modal: {
        ondismiss: function () {
          recordActivity({
            eventType: "payment_cancelled",
            path: window.location.pathname,
            checkoutId,
            customerName: contactForm.name.trim() || null,
            customerEmail: contactForm.email.trim().toLowerCase() || null,
            customerPhone: contactForm.phone.trim() || null,
            deliveryAddress: addressText,
            paymentMethod,
            amount: cartTotal,
          });
          setActiveCheckoutId("");
          alert("⚠️ Payment window cancel ho gayi hai.");
        },
      },
      prefill: {
        name: contactForm.name,
        email: contactForm.email,
        contact: contactForm.phone,
      },
      theme: {
        color: "#5c2c3b",
      },
    };

    const rzp = new (window as any).Razorpay(options);

    rzp.on("payment.failed", function (response: any) {
      recordActivity({
        eventType: "payment_failed",
        path: window.location.pathname,
        checkoutId,
        customerName: contactForm.name.trim() || null,
        customerEmail: contactForm.email.trim().toLowerCase() || null,
        customerPhone: contactForm.phone.trim() || null,
        deliveryAddress: addressText,
        paymentMethod,
        amount: cartTotal,
      });
      setActiveCheckoutId("");
      alert(
        "❌ Payment Failed!\nReason: " +
          (response.error.reason || "Unknown") +
          "\nDescription: " +
          (response.error.description || "Transaction failed")
      );
    });

    rzp.open();
  };

  const openAccount = () => {
    if (displayName && !isAdmin) {
      setLocation("/account");
      return;
    }
    setAccountMessage("");
    setAdminChallengeVisible(false);
    setAdminPhrase("");
    setAdminPin("");
    setModal("account");
  };

  const saveCustomerProfile = () => {
    const profile = { ...contactForm, name: contactForm.name.trim() };
    localStorage.setItem("manya-customer-profile", JSON.stringify(profile));
    setContactForm(profile);
    setDisplayName(profile.name);
  };

  const clearCustomerProfile = () => {
    localStorage.removeItem("manya-customer-profile");
    setContactForm({ name: "", phone: "", email: "" });
    setDisplayName("");
    setCustomerMode(true);
    setModal(null);
    setActiveProduct(null);
  };

  const handleLogout = () => {
    if (adminSession?.isAdmin) {
      adminLogout.mutate(undefined, {
        onSuccess: () => {
          clearCustomerProfile();
          void utils.admin.me.invalidate();
        },
      });
      return;
    }
    clearCustomerProfile();
  };

  const submitAccount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAllowedAdminIdentity(contactForm.email, contactForm.phone)) {
      setAdminChallengeVisible(true);
      setAccountMessage("Admin email & phone verified. Enter Passphrase & PIN below.");
      return;
    }
    setCustomerMode(true);
    adminLogout.mutate(undefined, {
      onSuccess: () => { void utils.admin.me.invalidate(); },
    });
    saveCustomerProfile();
    recordActivity({
      eventType: "customer_login",
      path: window.location.pathname,
      customerName: contactForm.name.trim(),
      customerEmail: contactForm.email.trim().toLowerCase(),
      customerPhone: contactForm.phone.trim(),
    });
    setAccountMessage(`Welcome, ${contactForm.name.trim()}. Your details are saved.`);
  };

  const submitAdminChallenge = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    adminLogin.mutate({
      email: contactForm.email,
      phone: contactForm.phone,
      passphrase: adminPhrase,
      pin: adminPin,
    } as never, {
      onSuccess: async () => {
        setCustomerMode(false);
        saveCustomerProfile();
        recordActivity({
          eventType: "admin_login",
          path: window.location.pathname,
          customerName: contactForm.name.trim(),
          customerEmail: contactForm.email.trim().toLowerCase(),
          customerPhone: contactForm.phone.trim(),
        });
        await utils.admin.me.invalidate();
        await utils.admin.me.refetch();
        setAdminChallengeVisible(false);
        setAdminPhrase("");
        setAdminPin("");
        setModal(null);
        setActiveProduct(null);
      },
      onError: () => {
        setAccountMessage("Credentials not accepted.");
      },
    });
  };

  const handleSaveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(adminForm.price);
    if (!adminForm.name.trim() || !Number.isFinite(price) || price < 1 || !adminForm.sizes.length) return;

    const next: Product = editingProduct
      ? {
          ...editingProduct,
          name: adminForm.name.trim(),
          price,
          fabric: adminForm.fabric,
          color: adminForm.color.trim() || "Ivory",
          category: adminForm.category,
          image: adminForm.image,
          sizes: adminForm.sizes,
          description: adminForm.description || "A piece from Manya Collection.",
          inStock: adminForm.inStock,
        }
      : {
        id: `manya-${Date.now()}`,
        name: adminForm.name.trim(),
        price,
        fabric: adminForm.fabric,
        color: adminForm.color.trim() || "Ivory",
        category: adminForm.category,
        image: adminForm.image,
        sizes: adminForm.sizes,
        description: adminForm.description || "A piece from Manya Collection.",
        badge: "New arrival",
        inStock: adminForm.inStock,
      };
    saveCatalogMutation.mutate(next, {
      onSuccess: () => {
        setProducts((current) => [next, ...current.filter((product) => product.id !== next.id)]);
        void utils.catalog.list.invalidate();
        setEditingProduct(null);
        setAdminForm({ name: "", price: "", fabric: "Cotton", color: "", category: "Everyday", image: PRODUCT_IMAGES[0], sizes: SIZES, description: "", inStock: true });
        setModal(null);
      },
      onError: () => window.alert("The suit could not be saved. Please check the connection and try again."),
    });
  };

  const openAddModal = () => {
    setLocation("/admin/products/add");
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setAdminForm({
      name: product.name,
      price: String(product.price),
      fabric: product.fabric,
      color: product.color,
      category: product.category,
      image: product.image,
      sizes: product.sizes,
      description: product.description,
      inStock: product.inStock,
    });
    setModal("editProduct");
  };

  const toggleStock = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const updated = { ...product, inStock: !product.inStock };
    saveCatalogMutation.mutate(updated, {
      onSuccess: () => {
        setProducts((current) => current.map((item) => item.id === productId ? updated : item));
        void utils.catalog.list.invalidate();
      },
    });
  };
  
  const deleteProduct = (productId: string) => {
    if (confirm("Kya aap is suit ko website se hatana chahte hain?")) {
      deleteCatalogMutation.mutate({ id: productId }, {
        onSuccess: () => {
          setProducts((current) => current.filter((item) => item.id !== productId));
          void utils.catalog.list.invalidate();
        },
      });
    }
  };

  const showAllPieces = () => {
    setFilter("All pieces");
    setFavouritesOnly(false);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  const backToAllPieces = () => {
    setFilter("All pieces");
    setFabric("All fabrics");
    setColour("All colours");
    setQuery("");
    setFavouritesOnly(false);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="manya-site">
      <div className="announcement-bar"><span>Free 💥shipping over 2999 💥</span></div>
      <header className="site-header">
        <a className="brand-lockup" href="#top">
          <span className="brand-seal">M</span>
          <span className="brand-wordmark"><span>Manya</span><small>COLLECTION</small></span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? "main-nav--open" : ""}`}>
          <a href="#collection" onClick={() => setMobileMenuOpen(false)}>Shop all</a>
          <a href="#collection" onClick={() => { setFilter("Everyday"); setMobileMenuOpen(false); }}>Everyday</a>
          <a href="#collection" onClick={() => { setFilter("Festive"); setMobileMenuOpen(false); }}>Festive edit</a>
          <a href="#story" onClick={() => setMobileMenuOpen(false)}>Our note</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button header-search" onClick={() => setModal("search")}><Search size={19} /></button>
          <a className="icon-button whatsapp-button" href={WHATSAPP_LINK} target="_blank" rel="noreferrer" aria-label="Chat with Manya Collection on WhatsApp"><MessageCircle size={18} /><span>WhatsApp</span></a>
          <button className="icon-button account-button" aria-label={displayName ? `Account: ${displayName}` : "Log in"} onClick={openAccount}><UserRound size={19} /><span className="action-label account-label">{displayName || (isAdmin ? "Admin Active" : "Log in")}</span></button>
          
          {/* Admin Add Suit Trigger */}
          {isAdmin && (
            <button className="admin-shortcut" onClick={openAddModal} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Plus size={15} /> Add Suit
            </button>
          )}

          {isAdmin && <button className="admin-activity-shortcut" onClick={() => setLocation("/admin/activity")} aria-label="Store activity"><Activity size={16} /><span>Activity</span></button>}

          {(isAdmin || displayName) && <button className="logout-link" onClick={handleLogout}>Log out</button>}
          
          <button className={`icon-button favorite-header ${favouritesOnly ? "is-active" : ""}`} aria-label={`Wishlist${favorites.length ? `, ${favorites.length} saved` : ""}`} aria-pressed={favouritesOnly} onClick={() => { setFavouritesOnly((v: boolean) => !v); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}><span className="wishlist-icon-wrap"><Heart size={19} fill={favorites.length ? "currentColor" : "none"} />{favorites.length > 0 && <b className="wishlist-count">{favorites.length > 99 ? "99+" : favorites.length}</b>}</span></button>
          <button className="icon-button bag-button" onClick={() => setModal("cart")}><span className="bag-wrap"><svg width="20" height="21" viewBox="0 0 20 21" fill="none"><path d="M3.25 7.25h13.5l1 11H2.25l1-11Z" stroke="currentColor" strokeWidth="1.35"/><path d="M6.5 7.25v-2a3.5 3.5 0 0 1 7 0v2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/></svg>{cartCount > 0 && <b>{cartCount}</b>}</span><span className="action-label">Bag</span></button>
          <button className="mobile-menu" onClick={() => setMobileMenuOpen((v: boolean) => !v)}>{mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <img className="hero-image" src={PRODUCT_IMAGES[3]} alt="Manya Collection" />
          <div className="hero-wash" />
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow">THE MANYA EDIT</span>
            <h1>Manya<br /><em>traditional wear</em></h1>
            <p>Indian occasionwear, chosen with feeling.</p>
            <button className="button button--wine hero-cta" onClick={showAllPieces}>Discover the collection <ArrowRight size={16} /></button>
          </div>
        </section>

        <section className="trust-strip">
          <div><Truck size={20} /><span>Carefully packed, always</span></div>
          <i />
          <div><ShieldCheck size={20} /><span>Thoughtful pieces</span></div>
          <i />
          <div><PackageCheck size={20} /><span>Easy exchanges</span></div>
        </section>

        <section className="collection-section" id="collection">
          <div className="collection-heading">
            <div>
              {favouritesOnly && <button className="wishlist-back" onClick={backToAllPieces}><ArrowLeft size={14} /> Back to all pieces</button>}
              <span className="eyebrow">CURATED WARDROBE</span>
              <h2>{favouritesOnly ? <>Your <em>wishlist.</em></> : <>Made to feel <em>like you.</em></>}</h2>
            </div>
            {!favouritesOnly && <button className="text-link" onClick={() => { setFilter("All pieces"); setFavouritesOnly(false); }}>View all <ArrowRight size={15} /></button>}
          </div>

          <div className="collection-controls">
            <div className="category-tabs">
              {["All pieces", "Everyday", "Festive", "Occasion wear", "Designer suits"].map((item) => (
                <button key={item} className={filter === item ? "category-tab is-selected" : "category-tab"} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
            <div className="filter-row">
              <div className="filter-heading"><SlidersHorizontal size={16} /><span>Refine</span></div>
              <label className="filter-select"><select value={fabric} onChange={(e) => setFabric(e.target.value)}><option>All fabrics</option><option>Pure cotton</option><option>Chiffon blend</option><option>Art silk</option></select><ChevronDown size={14} /></label>
              <label className="filter-select"><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select><ChevronDown size={14} /></label>
              <span className="product-count">{filteredProducts.length} pieces</span>
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product: Product) => (
              <article className="product-card" key={product.id}>
                <button className="product-image-button" onClick={() => openProduct(product)}>
                  <img src={product.image || getLocalProductImage(product.image)} alt={product.name} onError={(event) => handleProductImageError(event, product.image)} />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  {!product.inStock && <span className="product-badge" style={{ background: "#c0392b", color: "#fff" }}>Out of stock</span>}
                  <span className="quick-view">Discover <ArrowRight size={14} /></span>
                </button>
                <button className={`product-heart ${favorites.includes(product.id) ? "is-active" : ""}`} onClick={() => toggleFavorite(product.id)}><Heart size={18} fill={favorites.includes(product.id) ? "currentColor" : "none"} /></button>
                <button className="product-copy" onClick={() => openProduct(product)}>
                  <span className="product-meta">{product.fabric} · {product.color}</span>
                  <span className="product-name">{product.name}</span>
                  <span className="product-price">{money(product.price)} <small>INR</small></span>
                </button>

                {/* Live Admin Controls on Card */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: "6px", padding: "6px 0", borderTop: "1px solid #eee", marginTop: "6px" }}>
                    <button className="text-link" onClick={() => toggleStock(product.id)} style={{ fontSize: "11px" }}>
                      {product.inStock ? "Set Out Stock" : "Set In Stock"}
                    </button>
                    <button className="text-link" onClick={() => openEditModal(product)} style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "2px" }}>
                      <Edit size={12} /> Edit
                    </button>
                    <button className="text-link" onClick={() => deleteProduct(product.id)} style={{ fontSize: "11px", color: "red", display: "flex", alignItems: "center", gap: "2px" }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand"><a className="brand-lockup brand-lockup--footer" href="#top"><span className="brand-seal">M</span><span className="brand-wordmark"><span>Manya</span><small>COLLECTION</small></span></a></div>
          <div className="footer-column"><h3>Explore</h3><a href="#collection">Shop all</a></div>
        </div>
        <div className="footer-bottom"><span>©️ 2026 Manya Collection.</span></div>
      </footer>

      <Dialog open={Boolean(activeProduct) || Boolean(modal)} onOpenChange={(open: boolean) => { if (!open) { setActiveProduct(null); setModal(null); } }}>
        <DialogContent className="manya-dialog">
          {modal === "search" && (
            <div className="modal-section search-section">
              <DialogHeader>
                <DialogTitle>Search the collection</DialogTitle>
                <DialogDescription>Find a piece by name, fabric, color, or style.</DialogDescription>
              </DialogHeader>
              <label className="search-input-wrap">
                <Search size={17} />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try cotton, silk, or festive" />
              </label>
              {query.trim() ? (
                searchResults.length ? (
                  <div className="search-results">
                    {searchResults.map((product: Product) => (
                      <button className="search-result" key={product.id} onClick={() => { setModal(null); openProduct(product); }}>
                        <img src={product.image || getLocalProductImage(product.image)} alt="" onError={(event) => handleProductImageError(event, product.image)} />
                        <span className="search-result-copy">
                          <strong>{product.name}</strong>
                          <small>{product.fabric} · {product.color}</small>
                        </span>
                        <span className="search-result-price">{money(product.price)}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="search-empty">No pieces match “{query.trim()}”.</p>
              ) : <p className="search-empty">Start typing to see matching pieces.</p>}
            </div>
          )}

          {activeProduct && (
            <div className="product-detail">
              <div className="detail-image"><img src={activeProduct.image || getLocalProductImage(activeProduct.image)} alt={activeProduct.name} onError={(event) => handleProductImageError(event, activeProduct.image)} /></div>
              <div className="detail-copy">
                <DialogHeader><DialogTitle>{activeProduct.name}</DialogTitle><DialogDescription>{money(activeProduct.price)}</DialogDescription></DialogHeader>
                <p>{activeProduct.description}</p>
                <div className="size-options">
                  {activeProduct.sizes.map((size: string) => (
                    <button key={size} className={selectedSize === size ? "size-option is-selected" : "size-option"} onClick={() => setSelectedSize(size)}>{size}</button>
                  ))}
                </div>
                <div className="detail-buttons">
                  <button className="button button--wine" onClick={() => addToCart(activeProduct, selectedSize)} disabled={!activeProduct.inStock}>
                    {activeProduct.inStock ? "Add to bag" : "Out of Stock"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modal === "cart" && (
            <div className="modal-section">
              <DialogHeader><DialogTitle>Your Bag</DialogTitle></DialogHeader>
              {cart.map((line: CartLine) => {
                const product = products.find((item: Product) => item.id === line.productId);
                if (!product) return null;
                return (
                  <div className="cart-line" key={`${line.productId}-${line.size}`}>
                    <span>{product.name} ({line.size})</span>
                    <button onClick={() => updateQuantity(line.productId, line.size, -1)}><Minus size={13} /></button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.productId, line.size, 1)}><Plus size={13} /></button>
                  </div>
                );
              })}
              <div className="cart-subtotal"><span>Total:</span><b>{money(cartTotal)}</b></div>
              <button className="button button--wine button--wide" onClick={beginCheckout}>Checkout <ArrowRight size={16} /></button>
            </div>
          )}

          {modal === "checkout" && (
            <div className="modal-section">
              <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
              <form className="checkout-form" onSubmit={submitCheckout}>
                <label>Name<input required autoComplete="name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></label>
                <label>Phone<input required type="tel" autoComplete="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></label>
                <label>Email<input required type="email" autoComplete="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></label>
                <label>House / street address<input required autoComplete="street-address" maxLength={240} value={deliveryAddress.street} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })} /></label>
                <label>Landmark (optional)<input autoComplete="address-line2" maxLength={120} value={deliveryAddress.landmark} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })} /></label>
                <label>City<input required autoComplete="address-level2" maxLength={100} value={deliveryAddress.city} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} /></label>
                <label>State<input required autoComplete="address-level1" maxLength={100} value={deliveryAddress.state} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })} /></label>
                <label>PIN code<input required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} title="Enter a valid 6-digit PIN code" value={deliveryAddress.pincode} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></label>
                <fieldset className="checkout-payment-method">
                  <legend>Payment method</legend>
                  <label className={paymentMethod === "online" ? "is-selected" : ""}>
                    <input type="radio" name="paymentMethod" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} />
                    <span><strong>Online payment</strong><small>Pay securely now</small></span>
                  </label>
                  <label className={paymentMethod === "cod" ? "is-selected" : ""}>
                    <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                    <span><strong>Cash on delivery</strong><small>Pay when your order arrives</small></span>
                  </label>
                </fieldset>
                <button className="button button--wine button--wide" type="submit">{paymentMethod === "cod" ? "Place COD order" : `Pay ${money(cartTotal)}`}</button>
              </form>
            </div>
          )}

          {modal === "account" && (
            <div className="modal-section">
              <DialogHeader><DialogTitle>{displayName ? `Welcome, ${displayName}` : "Account / Login"}</DialogTitle></DialogHeader>
              <form className="checkout-form" onSubmit={submitAccount}>
                <label>Name<input required autoComplete="name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></label>
                <label>Email<input required type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} /></label>
                <label>Phone<input required type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></label>
                <button className="button button--wine button--wide" type="submit">{displayName ? "Update details" : "Continue"}</button>
              </form>
              {accountMessage && <p style={{ fontSize: "12px", marginTop: "8px", color: "maroon" }}>{accountMessage}</p>}
              {adminChallengeVisible && (
                <form className="admin-challenge-form" onSubmit={submitAdminChallenge} style={{ marginTop: "12px" }}>
                  <label>Passphrase<input required type="password" value={adminPhrase} onChange={(e) => setAdminPhrase(e.target.value)} /></label>
                  <label>8-Digit PIN<input required type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} /></label>
                  <button className="button button--wine button--wide" type="submit">Verify Admin</button>
                </form>
              )}
            </div>
          )}

          {(modal === "admin" || modal === "editProduct") && (
            <div className="modal-section">
              <DialogHeader><DialogTitle>{editingProduct ? "Edit Suit Details" : "Add New Suit"}</DialogTitle></DialogHeader>
              <form className="checkout-form" onSubmit={handleSaveProduct}>
                <label>Suit Name<input required value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} /></label>
                <label>Price (INR)<input required type="number" value={adminForm.price} onChange={(e) => setAdminForm({ ...adminForm, price: e.target.value })} /></label>
                <label>Fabric<input value={adminForm.fabric} onChange={(e) => setAdminForm({ ...adminForm, fabric: e.target.value })} /></label>
                <label>Color<input value={adminForm.color} onChange={(e) => setAdminForm({ ...adminForm, color: e.target.value })} /></label>
                <label>Image URL<input value={adminForm.image} onChange={(e) => setAdminForm({ ...adminForm, image: e.target.value })} /></label>
                <label>Choose from gallery<input type="file" accept="image/*" onChange={handleImageUpload} /></label>
                <label>Take a photo<input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} /></label>
                <fieldset className="admin-size-picker">
                  <legend>Available sizes</legend>
                  {SIZE_OPTIONS.map((size) => (
                    <label key={size}>
                      <input type="checkbox" checked={adminForm.sizes.includes(size)} onChange={() => setAdminForm((current) => ({
                        ...current,
                        sizes: current.sizes.includes(size)
                          ? current.sizes.filter((item) => item !== size)
                          : [...current.sizes, size],
                      }))} />
                      {size}
                    </label>
                  ))}
                </fieldset>
                <label>Description<textarea value={adminForm.description} onChange={(e) => setAdminForm({ ...adminForm, description: e.target.value })} /></label>
                <label style={{ flexDirection: "row", alignItems: "center", gap: "8px" }}>
                  <input type="checkbox" checked={adminForm.inStock} onChange={(e) => setAdminForm({ ...adminForm, inStock: e.target.checked })} /> In Stock
                </label>
                <button className="button button--wine button--wide" type="submit">{editingProduct ? "Update Suit" : "Publish Suit"}</button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}