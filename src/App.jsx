import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Barcode,
  CalendarDays,
  MapPin,
  Snowflake,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  Package,
  Settings,
  Save,
  Cloud,
  HardDrive,
  FileUp,
  Camera,
  Loader2,
  Store,
  ArrowUpDown,
} from "lucide-react";

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script load error for ${src}`));
    document.head.appendChild(script);
  });
};

const getTodayStr = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// 🌟 真實的 Firebase 金鑰 🌟
const firebaseConfig = {
  apiKey: "AIzaSyAWjwBTH3Wsv7ZSkR73W1o8hULF5uiWIws",
  authDomain: "ikea-36103.firebaseapp.com",
  projectId: "ikea-36103",
  storageBucket: "ikea-36103.firebasestorage.app",
  messagingSenderId: "174471808960",
  appId: "1:174471808960:web:27b2c4fff31422ce1bea25",
  measurementId: "G-LFL5ZDV54C",
};

export default function ExpiryManager() {
  const [db, setDb] = useState(null);
  const [useLocalMode, setUseLocalMode] = useState(true);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 搜尋與排序狀態
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("expiry"); // expiry, quantity
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc

  // 狀態篩選器 (all, warning, expired)
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentStore, setCurrentStore] = useState(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(true);
  const [stores, setStores] = useState([
    "內湖",
    "新莊",
    "新店",
    "小巨蛋",
    "青埔",
    "台中",
    "高雄",
  ]);

  const [locations, setLocations] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 更新預設表單：加入第二提醒
  const defaultForm = {
    barcode: "",
    name: "",
    category: "room_temp",
    location: "",
    receiveDate: getTodayStr(),
    expiryDate: "",
    quantity: 1,
    reminderDays: 7,
    hasSecondReminder: false,
    reminderDays2: 3,
  };
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);

  const [isImporting, setIsImporting] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);

  const scannerRef = useRef(null);

  const handleStopBarcodeScanner = () => {
    setIsBarcodeScanning(false);
    if (scannerRef.current) {
      try {
        scannerRef.current
          .clear()
          .catch((e) => console.log("關閉相機略過錯誤", e));
      } catch (e) {
        console.log(e);
      }
      scannerRef.current = null;
    }
  };

  const closeModal = () => {
    handleStopBarcodeScanner();
    setIsModalOpen(false);
    setIsOcrScanning(false);
    setEditingId(null);
    setFormData(defaultForm);
  };

  useEffect(() => {
    const loadLibs = async () => {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
        );
        await loadScript("https://unpkg.com/html5-qrcode");
        await loadScript(
          "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
        );
        await loadScript(
          "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"
        );
        await loadScript(
          "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"
        );
        setLibrariesLoaded(true);
      } catch (e) {
        console.error("載入外部套件失敗", e);
      }
    };
    loadLibs();
  }, []);

  useEffect(() => {
    if (!librariesLoaded || !currentStore) return;

    const initFirebase = async () => {
      if (!firebaseConfig.apiKey) {
        loadLocalData();
        return;
      }

      try {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(firebaseConfig);
        }

        const firestoreDb = window.firebase.firestore();
        const auth = window.firebase.auth();

        await auth.signInAnonymously();
        setDb(firestoreDb);
        setUseLocalMode(false);

        firestoreDb
          .collection("stores")
          .doc(currentStore)
          .collection("products")
          .onSnapshot(
            (snapshot) => {
              const productsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setProducts(productsData);
              setLoading(false);
            },
            (error) => {
              console.error("Firebase 讀取錯誤:", error);
              loadLocalData();
            }
          );

        firestoreDb
          .collection("settings")
          .doc("global")
          .onSnapshot((docSnap) => {
            if (docSnap.exists && docSnap.data().locations) {
              setLocations(docSnap.data().locations);
            } else {
              setLocations(["倉庫A", "展示架", "冷藏室", "冷凍庫"]);
            }
          });
      } catch (error) {
        console.error("Firebase 初始化失敗", error);
        loadLocalData();
      }
    };

    initFirebase();
  }, [librariesLoaded, currentStore]);

  const loadLocalData = () => {
    setUseLocalMode(true);
    const localProducts =
      JSON.parse(localStorage.getItem(`expiry_products_${currentStore}`)) || [];
    const localSettings = JSON.parse(
      localStorage.getItem("expiry_manager_settings")
    ) || { locations: ["倉庫A", "展示架", "冷藏室", "冷凍庫"] };
    setProducts(localProducts);
    setLocations(localSettings.locations);
    setLoading(false);
  };

  useEffect(() => {
    if (formData.barcode && !editingId) {
      const fetchMasterData = async () => {
        if (!useLocalMode && db) {
          try {
            const masterRef = db
              .collection("master_products")
              .doc(formData.barcode);
            const docSnap = await masterRef.get();
            if (docSnap.exists) {
              const masterData = docSnap.data();
              setFormData((prev) => ({
                ...prev,
                name: prev.name || masterData.name,
                category: masterData.category || prev.category,
                reminderDays: masterData.reminderDays || prev.reminderDays,
              }));
              return;
            }
          } catch (e) {
            console.error("查詢商品主檔失敗", e);
          }
        }
      };
      fetchMasterData();
    }
  }, [formData.barcode, db, useLocalMode, editingId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleStartBarcodeScanner = () => {
    if (!window.Html5QrcodeScanner) {
      alert("掃描套件載入中，請稍後再試。");
      return;
    }

    setIsBarcodeScanning(true);

    setTimeout(() => {
      try {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }

        const html5QrcodeScanner = new window.Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0, // 幫助手機版維持比例
          },
          false
        );

        scannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.render(
          (decodedText) => {
            setFormData((prev) => ({ ...prev, barcode: decodedText }));
            handleStopBarcodeScanner();
          },
          (errorMessage) => {
            // 捕捉底層相機權限錯誤
            if (
              errorMessage.includes("NotAllowedError") ||
              errorMessage.includes("Permission denied")
            ) {
              alert("相機權限被拒絕！請確保您允許瀏覽器使用相機。");
              handleStopBarcodeScanner();
            }
          }
        );
      } catch (err) {
        alert("無法啟動相機，請確認瀏覽器權限或使用實體網址開啟。");
        setIsBarcodeScanning(false);
      }
    }, 200);
  };

  const handleExcelImport = (e) => {
    if (!librariesLoaded || !window.XLSX) {
      alert("Excel 解析套件載入中，請稍後再試。");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = window.XLSX.read(bstr, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = window.XLSX.utils.sheet_to_json(ws);

        const newProducts = [];
        const masterUpdates = [];

        for (const row of data) {
          const parseDate = (val) => {
            if (!val) return "";
            if (val instanceof Date) {
              return `${val.getFullYear()}-${String(
                val.getMonth() + 1
              ).padStart(2, "0")}-${String(val.getDate()).padStart(2, "0")}`;
            }
            return String(val).replace(/\//g, "-").replace(/\./g, "-");
          };

          const product = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            barcode: String(
              row["條碼"] ||
                row["商品條碼"] ||
                Math.floor(1000000000000 + Math.random() * 9000000000000)
            ),
            name: String(row["品名"] || row["商品名稱"] || "未命名商品"),
            category: String(row["溫層"] || "").includes("冷凍")
              ? "frozen"
              : "room_temp",
            location: String(row["地點"] || row["存放地點"] || ""),
            receiveDate:
              parseDate(row["進貨日"] || row["進貨日期"]) || getTodayStr(),
            expiryDate: parseDate(row["有效期限"] || row["到期日"]),
            quantity: Number(row["數量"] || 1),
            reminderDays: Number(row["提醒天數"] || 7),
            hasSecondReminder: false,
            reminderDays2: 3,
            updatedAt: new Date().toISOString(),
          };

          if (product.name && product.expiryDate) {
            newProducts.push(product);
            masterUpdates.push({
              barcode: product.barcode,
              name: product.name,
              category: product.category,
              reminderDays: product.reminderDays,
            });
          }
        }

        if (useLocalMode) {
          const updatedProducts = [...products, ...newProducts];
          setProducts(updatedProducts);
          localStorage.setItem(
            `expiry_products_${currentStore}`,
            JSON.stringify(updatedProducts)
          );
        } else if (db && currentStore) {
          const batch = db.batch();
          for (const prod of newProducts) {
            batch.set(
              db
                .collection("stores")
                .doc(currentStore)
                .collection("products")
                .doc(prod.id),
              prod
            );
          }
          for (const master of masterUpdates) {
            batch.set(
              db.collection("master_products").doc(master.barcode),
              master,
              { merge: true }
            );
          }
          await batch.commit();
        }
        alert(`成功匯入 ${newProducts.length} 筆資料！`);
      } catch (error) {
        alert("Excel 匯入失敗，請確認檔案格式是否正確。");
      } finally {
        setIsImporting(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCameraCapture = async (e) => {
    if (!librariesLoaded || !window.Tesseract) {
      alert("OCR 辨識套件載入中，請稍後再試。");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setIsOcrScanning(true);
    try {
      const worker = await window.Tesseract.createWorker("eng");
      const ret = await worker.recognize(file);
      const text = ret.data.text;
      await worker.terminate();

      const match = text.match(
        /(20\d{2}|\d{2})[-/.\s](0[1-9]|1[0-2])[-/.\s](0[1-9]|[12]\d|3[01])/
      );

      if (match) {
        let year = match[1].length === 2 ? `20${match[1]}` : match[1];
        let month = match[2].padStart(2, "0");
        let day = match[3].padStart(2, "0");
        setFormData((prev) => ({
          ...prev,
          expiryDate: `${year}-${month}-${day}`,
        }));
      } else {
        alert("找不到標準日期格式，請重新拍攝。");
      }
    } catch (error) {
      alert("辨識失敗，請確認圖片是否清晰。");
    } finally {
      setIsOcrScanning(false);
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      quantity: Number(formData.quantity),
      reminderDays: Number(formData.reminderDays),
      reminderDays2: Number(formData.reminderDays2),
      updatedAt: new Date().toISOString(),
    };

    if (useLocalMode) {
      let updatedProducts = editingId
        ? products.map((p) =>
            p.id === editingId ? { ...dataToSave, id: editingId } : p
          )
        : [...products, { ...dataToSave, id: Date.now().toString() }];
      setProducts(updatedProducts);
      localStorage.setItem(
        `expiry_products_${currentStore}`,
        JSON.stringify(updatedProducts)
      );
    } else if (db && currentStore) {
      const batch = db.batch();
      if (editingId) {
        batch.update(
          db
            .collection("stores")
            .doc(currentStore)
            .collection("products")
            .doc(editingId),
          dataToSave
        );
      } else {
        batch.set(
          db
            .collection("stores")
            .doc(currentStore)
            .collection("products")
            .doc(),
          dataToSave
        );
      }
      if (formData.barcode) {
        batch.set(
          db.collection("master_products").doc(formData.barcode),
          {
            name: dataToSave.name,
            category: dataToSave.category,
            reminderDays: dataToSave.reminderDays,
            updatedAt: dataToSave.updatedAt,
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除這筆庫存嗎？")) return;
    if (useLocalMode) {
      const updatedProducts = products.filter((p) => p.id !== id);
      setProducts(updatedProducts);
      localStorage.setItem(
        `expiry_products_${currentStore}`,
        JSON.stringify(updatedProducts)
      );
    } else if (db) {
      await db
        .collection("stores")
        .doc(currentStore)
        .collection("products")
        .doc(id)
        .delete();
    }
  };

  const handleEdit = (product) => {
    setFormData(product);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  // 地點設定相關
  const handleAddLocation = async (e) => {
    e.preventDefault();
    const newLoc = newLocationInput.trim();
    if (!newLoc || locations.includes(newLoc)) return;

    const updatedLocations = [...locations, newLoc];
    if (useLocalMode) {
      setLocations(updatedLocations);
      localStorage.setItem(
        "expiry_manager_settings",
        JSON.stringify({ locations: updatedLocations })
      );
    } else if (db) {
      await db
        .collection("settings")
        .doc("global")
        .set({ locations: updatedLocations }, { merge: true });
    }
    setNewLocationInput("");
  };

  const handleDeleteLocation = async (locToDelete) => {
    if (
      !window.confirm(
        `確定要刪除地點「${locToDelete}」嗎？\n(注意：現有商品的地點紀錄將不受影響)`
      )
    )
      return;

    const updatedLocations = locations.filter((l) => l !== locToDelete);
    if (useLocalMode) {
      setLocations(updatedLocations);
      localStorage.setItem(
        "expiry_manager_settings",
        JSON.stringify({ locations: updatedLocations })
      );
    } else if (db) {
      await db
        .collection("settings")
        .doc("global")
        .set({ locations: updatedLocations }, { merge: true });
    }
  };

  // 更新狀態判斷：支援雙重提醒
  const getExpiryStatus = (
    expiryDate,
    reminderDays,
    hasSecondReminder = false,
    reminderDays2 = 3
  ) => {
    const today = new Date(getTodayStr());
    const expDate = new Date(expiryDate);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        status: "expired",
        label: "已過期",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        days: Math.abs(diffDays),
      };

    // 如果有啟用第二提醒，只要滿足其中一個條件就算是「即將過期」警告
    const isWarning1 = diffDays <= reminderDays;
    const isWarning2 = hasSecondReminder && diffDays <= reminderDays2;

    if (isWarning1 || isWarning2) {
      return {
        status: "warning",
        label: "即將過期",
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        days: diffDays,
      };
    }

    return {
      status: "safe",
      label: "效期正常",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      days: diffDays,
    };
  };

  // 根據搜尋與狀態按鈕過濾
  let filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    if (!matchSearch) return false;

    if (filterStatus !== "all") {
      const statusObj = getExpiryStatus(
        p.expiryDate,
        p.reminderDays,
        p.hasSecondReminder,
        p.reminderDays2
      );
      if (statusObj.status !== filterStatus) return false;
    }
    return true;
  });

  // 雙向排序邏輯
  filteredProducts.sort((a, b) => {
    let result = 0;
    if (sortBy === "expiry") {
      result = new Date(a.expiryDate) - new Date(b.expiryDate);
    } else if (sortBy === "quantity") {
      result = a.quantity - b.quantity;
    }
    return sortOrder === "asc" ? result : -result;
  });

  const stats = {
    total: products.length,
    warning: products.filter(
      (p) =>
        getExpiryStatus(
          p.expiryDate,
          p.reminderDays,
          p.hasSecondReminder,
          p.reminderDays2
        ).status === "warning"
    ).length,
    expired: products.filter(
      (p) =>
        getExpiryStatus(
          p.expiryDate,
          p.reminderDays,
          p.hasSecondReminder,
          p.reminderDays2
        ).status === "expired"
    ).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
      {/* 頂部選店視窗 */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Store className="w-6 h-6 text-blue-600" />
              選擇管理分店
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              請選擇您目前要管理哪一家分店的效期庫存。
            </p>
            <div className="grid grid-cols-2 gap-3">
              {stores.map((store) => (
                <button
                  key={store}
                  onClick={() => {
                    setCurrentStore(store);
                    setIsStoreModalOpen(false);
                  }}
                  className="p-3 border border-gray-200 rounded-xl font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
                >
                  {store}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Package className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                效期管家
                {currentStore && (
                  <span
                    onClick={() => setIsStoreModalOpen(true)}
                    className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium cursor-pointer hover:bg-slate-200"
                  >
                    🏠 {currentStore}
                  </span>
                )}
              </h1>
              <span className="text-[10px] text-gray-400">
                {useLocalMode ? "單機模式" : "雲端模式"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
            <label className="p-2 bg-emerald-100 text-emerald-600 rounded-lg cursor-pointer">
              {isImporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileUp className="w-5 h-5" />
              )}
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleExcelImport}
              />
            </label>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-blue-600 text-white rounded-lg shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats & Search */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* 改進：統計方塊加上篩選點擊功能 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            onClick={() => setFilterStatus("all")}
            className={`cursor-pointer transition-all bg-white p-3 rounded-xl border shadow-sm flex flex-col items-center ${
              filterStatus === "all"
                ? "ring-2 ring-blue-500 border-blue-500"
                : "hover:bg-gray-50"
            }`}
          >
            <span className="text-2xl font-bold">{stats.total}</span>
            <span className="text-xs text-gray-500">總批次</span>
          </div>
          <div
            onClick={() => setFilterStatus("warning")}
            className={`cursor-pointer transition-all bg-orange-50 p-3 rounded-xl border shadow-sm flex flex-col items-center ${
              filterStatus === "warning"
                ? "ring-2 ring-orange-500 border-orange-500"
                : "border-orange-100 hover:bg-orange-100/50"
            }`}
          >
            <span className="text-2xl font-bold text-orange-600">
              {stats.warning}
            </span>
            <span className="text-xs text-orange-700">即將過期</span>
          </div>
          <div
            onClick={() => setFilterStatus("expired")}
            className={`cursor-pointer transition-all bg-red-50 p-3 rounded-xl border shadow-sm flex flex-col items-center ${
              filterStatus === "expired"
                ? "ring-2 ring-red-500 border-red-500"
                : "border-red-100 hover:bg-red-100/50"
            }`}
          >
            <span className="text-2xl font-bold text-red-600">
              {stats.expired}
            </span>
            <span className="text-xs text-red-700">已過期</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜尋名稱或條碼..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm"
            />
          </div>

          {/* 精簡後的排序區塊 */}
          <div className="flex bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 text-sm text-gray-600 bg-transparent outline-none border-r border-gray-100"
            >
              <option value="expiry">依效期</option>
              <option value="quantity">依數量</option>
            </select>
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="px-3 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
            >
              <ArrowUpDown
                className={`w-4 h-4 transition-transform ${
                  sortOrder === "desc" ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {loading || !currentStore ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            請先選擇店別以載入資料
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">該條件下尚無商品紀錄</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const status = getExpiryStatus(
                product.expiryDate,
                product.reminderDays,
                product.hasSecondReminder,
                product.reminderDays2
              );
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border ${status.border} relative overflow-hidden`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${status.bg
                      .replace("bg-", "bg-")
                      .replace("-50", "-400")}`}
                  />
                  <div className="flex justify-between items-start pl-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg mb-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 font-mono">
                        <Barcode className="w-3.5 h-3.5" /> {product.barcode}
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {product.location || "未指定地點"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-gray-400" />
                          數量: <strong>{product.quantity}</strong>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2 text-xs">
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          進貨: {product.receiveDate} | 到期:{" "}
                          {product.expiryDate}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between h-full min-h-[100px]">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1 text-gray-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 text-gray-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div
                        className={`text-right px-2.5 py-1 rounded-lg ${status.bg} ${status.color} font-medium text-sm flex flex-col items-end`}
                      >
                        <span className="flex items-center gap-1">
                          {status.label}
                        </span>
                        <span className="text-xs opacity-80">
                          {status.status === "expired"
                            ? `已過期 ${status.days} 天`
                            : `剩餘 ${status.days} 天`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 地點設定視窗 (修復遺漏) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <Settings className="w-5 h-5 text-gray-500" /> 管理存放地點
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto mb-4 space-y-2 custom-scrollbar pr-2">
              {locations.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  尚無設定地點
                </p>
              )}
              {locations.map((loc) => (
                <div
                  key={loc}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100"
                >
                  <span className="text-slate-700 font-medium text-sm">
                    {loc}
                  </span>
                  <button
                    onClick={() => handleDeleteLocation(loc)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddLocation} className="flex gap-2">
              <input
                value={newLocationInput}
                onChange={(e) => setNewLocationInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="輸入新地點名稱..."
              />
              <button
                type="submit"
                disabled={!newLocationInput.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50"
              >
                新增
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 新增/編輯視窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <Plus className="w-6 h-6 text-blue-600" />{" "}
                {editingId ? "編輯商品" : "新增商品"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1 custom-scrollbar">
              <form
                id="productForm"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* 條碼掃描區塊 */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    商品條碼
                  </label>
                  {isBarcodeScanning ? (
                    <div className="border border-blue-200 rounded-xl overflow-hidden bg-black relative shadow-inner min-h-[300px]">
                      <div id="reader" className="w-full h-full"></div>
                      <button
                        type="button"
                        onClick={handleStopBarcodeScanner}
                        className="absolute top-2 right-2 bg-red-600/90 text-white p-2.5 rounded-full z-10 shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="barcode"
                        required
                        value={formData.barcode}
                        onChange={handleInputChange}
                        placeholder="點擊右側相機掃描..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleStartBarcodeScanner}
                        className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 shadow-sm"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    商品名稱
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      溫層
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-gray-50 focus:bg-white outline-none"
                    >
                      <option value="room_temp">常溫</option>
                      <option value="frozen">冷凍</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      存放地點
                    </label>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-gray-50 focus:bg-white outline-none"
                    >
                      <option value="">請選擇...</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      進貨日
                    </label>
                    <input
                      type="date"
                      name="receiveDate"
                      required
                      value={formData.receiveDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-gray-50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      有效期限
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        name="expiryDate"
                        required
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        className="flex-1 px-2 py-3 border border-gray-300 rounded-xl text-base bg-gray-50 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      數量
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700">
                      到期前提醒 (天)
                    </label>
                    <input
                      type="number"
                      name="reminderDays"
                      min="1"
                      required
                      value={formData.reminderDays}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none"
                    />
                  </div>

                  {/* 第二個到期日提醒區塊 */}
                  <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        name="hasSecondReminder"
                        checked={formData.hasSecondReminder}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      設定第二個到期提醒
                    </label>
                    {formData.hasSecondReminder && (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-500">
                          第二提醒 (天)
                        </label>
                        <input
                          type="number"
                          name="reminderDays2"
                          min="1"
                          required={formData.hasSecondReminder}
                          value={formData.reminderDays2}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base outline-none bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3 justify-start pb-12 sm:pb-4">
              <button
                type="submit"
                form="productForm"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition"
              >
                <Save className="w-5 h-5" /> 儲存資料
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-3 text-slate-600 bg-white border border-gray-300 font-bold rounded-xl shadow-sm active:scale-95 transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
