import { Fragment, useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
    getItemsThunk, 
    deleteItemThunk, 
    getDeletedItemsThunk,
    restoreItemThunk,
    bulkDeleteItemsThunk,
    bulkUpdatePriceThunk,
    bulkUpdateItemsThunk,
    bulkSetAttributesThunk,
    upsertItemAttributeThunk, 
    upsertOptionNestedAttributesThunk,
    upsertItemSpecialAttributeThunk, 
    deleteItemSpecialAttributeThunk, 
    deleteItemAttributeThunk 
} from "../../../store/items";
import { Modal, Button, Table, Badge, Form, InputGroup, Spinner, Card, Row, Col } from "react-bootstrap";
import { getAllAttributesThunk } from "../../../store/attributes";
import { setShowAddModal, setShowCreateGroupModal } from "../../../store/items";
import Select from "react-select";
import EditProducts from "./EditProducts";
import AddProducts from "./AddProducts";
import { 
    FaChevronDown, FaChevronRight, FaEdit, FaTrash, 
    FaPlus, FaEyeSlash, FaSearch, FaLayerGroup, FaTags, FaFire, FaThumbsUp, FaClock, FaStar, FaBoxOpen, FaExclamationTriangle, FaCircle, FaTools, FaArchive, FaUndo, FaFileExcel
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { useNavigate, useLocation } from "react-router-dom";
import makeAnimated from "react-select/animated";
import CreateItemGroupModal from "./AddItemgroupModal";
import { getItemGroupsThunk } from "../../../store/itemgroups";
import EditItemGroupModal from "./EditItemgroupModal";
import { getPizzasThunk } from "../../../store/customizablePizza";
import { getCategoriesThunk } from "../../../store/categories";
import swal from "sweetalert";
import { useTranslation } from "react-i18next";
import { compareDisplayOrder, sortByDisplayOrder } from "../../../utils/displayOrderSort";

const animatedComponents = makeAnimated();
const PLACEHOLDER_IMAGE = "https://theme-assets.getbento.com/sensei/d6ec5a4.sensei/assets/images/catering-item-placeholder-704x520.png";

const formatDisplayIndex = (index) => {
    if (index === null || index === undefined || index === "") return "—";
    return `#${index}`;
};

const CategorySelectCheckbox = ({ checked, indeterminate, onChange, label }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
    }, [indeterminate, checked]);
    return (
        <input
            ref={ref}
            type="checkbox"
            className="form-check-input"
            checked={checked}
            onChange={onChange}
            aria-label={label}
        />
    );
};

const ItemSelectCheckbox = ({ itemId, selected, onToggle }) => (
    <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}>
        <Form.Check
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(itemId)}
            aria-label={`Select item ${itemId}`}
        />
    </td>
);

const sortItemModifiers = (attrs = []) =>
    [...attrs].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));

const mapItemAttributesForSelect = (item) =>
    sortItemModifiers(item?.Restaurant_Item_Attributes).map((a) => ({
        value: a?.Item_Attribute?.id,
        label: a?.Item_Attribute?.name,
        index: a?.index ?? 0,
    }));

// --- Sub-Item Row ---
const SubItemRow = memo(({ item, onEdit, onDelete, onAttribute, onSpecial, formatFlag, selected, onToggleSelect }) => {
    if (!item) return null;
    return (
        <tr className="sub-item-row" style={{ backgroundColor: "#fbfcfd", cursor: "pointer" }} onClick={() => onEdit(item)}>
            <ItemSelectCheckbox itemId={item.id} selected={selected} onToggle={onToggleSelect} />
            <td className="text-center align-middle">
                <span className="text-muted" style={{ fontSize: "0.65rem", fontWeight: "600" }}>{formatDisplayIndex(item?.index)}</span>
            </td>
            <td className="align-middle" style={{ width: "80px", position: "relative" }}>
                <div style={{ position: "absolute", left: "24px", top: "-10px", bottom: "0", width: "2px", backgroundColor: "#e2e8f0" }}></div>
                <div style={{ position: "absolute", left: "24px", top: "50%", width: "16px", height: "2px", backgroundColor: "#e2e8f0" }}></div>
                <div className="d-flex justify-content-end pe-2 position-relative">
                    <img 
                        src={item?.image_url || PLACEHOLDER_IMAGE} 
                        className="rounded shadow-sm border bg-white" 
                        style={{ width: "36px", height: "36px", objectFit: "cover", zIndex: 1 }} 
                        alt="" 
                    />
                </div>
            </td>
            <td className="align-middle">
                <div className="fw-bold text-dark mb-0" style={{ fontSize: "0.9rem" }}>{item?.name}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{item?.chinese_name}</div>
                
                {/* LARGER OPTIONS DISPLAY */}
                <div className="d-flex flex-wrap gap-2 mt-2">
                    {sortItemModifiers(item?.Restaurant_Item_Attributes).map((attr, idx) => (
                        <Badge key={`r-${attr?.Item_Attribute?.id ?? idx}`} bg="light" text="dark" className="border fw-medium px-2 py-1" style={{ fontSize: '0.85rem' }}>
                            {attr?.Item_Attribute?.name}
                        </Badge>
                    ))}
                    {item?.special_attributes?.map((attr, idx) => (
                        <Badge key={`s-${idx}`} bg="indigo-soft" className="text-primary border border-primary border-opacity-10 fw-bold px-2 py-1" style={{ fontSize: '0.85rem' }}>
                            <FaTools size={10} className="me-1"/>{attr?.name}
                        </Badge>
                    ))}
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                    {item?.Ingredients?.map((ing, idx) => (
                        <Badge key={`ing-${idx}`} bg="info" className="fw-medium px-2 py-1" style={{ fontSize: '0.75rem' }}>
                            {ing?.icon && <span className="me-1">{ing.icon}</span>}
                            {ing?.name}
                        </Badge>
                    ))}
                    {item?.flags?.filter((f) => {
                        if (item?.menu_only) {
                            const flagStr = typeof f === "string" ? f : (f?.id || "");
                            return flagStr.toLowerCase() !== "item";
                        }
                        return true;
                    }).map((f, idx) => (
                        <Badge key={`flag-${idx}`} bg="white" text="dark" className="border shadow-none fw-medium text-uppercase" style={{ fontSize: '8px' }}>{formatFlag(f)}</Badge>
                    ))}
                </div>
            </td>
            <td className="align-middle">
                <div className="d-flex flex-wrap gap-1 align-items-center">
                    <span className="fw-bold text-primary me-2">${item?.price}</span>
                    {item?.sold_out && <Badge bg="danger" style={{ fontSize: '9px' }}>SOLD OUT</Badge>}
                    {item?.menu_only && <Badge bg="secondary" style={{ fontSize: '9px' }}>MENU ONLY</Badge>}
                </div>
            </td>
            <td className="text-end pe-4 align-middle">
                <div className="d-flex justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline-secondary" size="sm" className="btn-icon-soft" onClick={() => onEdit(item)}><FaEdit /></Button>
                    <Button variant="outline-secondary" size="sm" className="btn-icon-soft" onClick={() => onAttribute(item)}><FaPlus /></Button>
                    <Button variant="outline-secondary" size="sm" className="btn-icon-soft" onClick={() => onSpecial(item)}><FaTags /></Button>
                    <Button variant="outline-danger" size="sm" className="btn-icon-soft" onClick={() => onDelete(item)}><FaTrash /></Button>
                </div>
            </td>
        </tr>
    );
});

function AllProduct() {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const items = useSelector((state) => state.items?.items) || [];
    const deletedItems = useSelector((state) => state.items?.deletedItems) || [];
    const attributes = useSelector((state) => state.attributes?.attributes) || [];
    const specialAttributes = useSelector((state) => state.customizablePizzas?.allPizzas) || [];
    const itemGroups = useSelector((state) => state.itemgroup?.itemGroups) || [];
    const categoryRows = useSelector((state) => state.categories?.categories) || [];
    const showAddModal = useSelector((state) => state.items?.showAddModal);
    const showCreateGroupModal = useSelector((state) => state.items?.showCreateGroupModal);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); 
    const [expandedGroups, setExpandedGroups] = useState({});
    const [collapsedCategories, setCollapsedCategories] = useState({});
    const [expandAllState, setExpandAllState] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
    const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
    const [bulkPrice, setBulkPrice] = useState("");
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [bulkStatus, setBulkStatus] = useState({ sold_out: "", hidden: "", hot_item: "", new_item: "", must_order: "" });
    const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
    const [bulkCategoryId, setBulkCategoryId] = useState("");
    const [showBulkModifyModal, setShowBulkModifyModal] = useState(false);
    const [bulkModifyAttributes, setBulkModifyAttributes] = useState([]);
    const [bulkModifyMode, setBulkModifyMode] = useState("add");
    const [bulkLoading, setBulkLoading] = useState(false);
    const { t } = useTranslation();
    
    const [showEditModal, setShowEditModal] = useState(false);
    // const [showAddModal, setShowAddModal] = useState(false); // Moved to Redux
    const [showAttributeModal, setShowAttributeModal] = useState(false);
    const [showSpecialAttributeModal, setShowSpecialAttributeModal] = useState(false);
    // const [showCreateGroupModal, setShowCreateGroupModal] = useState(false); // Moved to Redux
    const [showEditGroupModal, setShowEditGroupModal] = useState(false);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [showRestoreCategoryModal, setShowRestoreCategoryModal] = useState(false);
    const [restorePickItem, setRestorePickItem] = useState(null);
    const [restorePickCategoryId, setRestorePickCategoryId] = useState("");
    
    const [selectEditItem, setSelectEditItem] = useState(null);
    const [selectedAttributes, setSelectedAttributes] = useState([]);
    const [optionNestedMap, setOptionNestedMap] = useState({});
    const [activeModifierId, setActiveModifierId] = useState(null);
    const [selectedSpecialAttributes, setSelectedSpecialAttributes] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([
                dispatch(getItemsThunk()),
                dispatch(getDeletedItemsThunk()),
                dispatch(getCategoriesThunk()),
                dispatch(getAllAttributesThunk()),
                dispatch(getItemGroupsThunk()),
                dispatch(getPizzasThunk())
            ]);
            setLoading(false);
        };
        fetchData();
    }, [dispatch]);

    useEffect(() => {
        if (location.state?.openAddModal) {
            dispatch(setShowAddModal(true));
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.openAddModal, location.pathname, navigate, dispatch]);

    useEffect(() => {
        if (!selectEditItem?.id || !items?.length || showAttributeModal) return;
        const fresh = items.find((item) => Number(item.id) === Number(selectEditItem.id));
        if (!fresh) return;

        setSelectEditItem({
            ...fresh,
            Restaurant_Item_Attributes: sortItemModifiers(fresh.Restaurant_Item_Attributes),
        });
    }, [items, selectEditItem?.id, showAttributeModal]);

    const stats = {
        total: items?.length || 0,
        soldOut: items?.filter(i => i?.sold_out)?.length || 0,
        hidden: items?.filter(i => i?.hidden)?.length || 0,
    };

    const orderedCategorySections = useMemo(() => {
        const cats = categoryRows || [];
        const topLevel = sortByDisplayOrder(
            cats.filter((c) => !c.parent_id),
            (c) => c.index,
            (c) => c.name,
        );

        const itemsByCatId = new Map();
        items.forEach((i) => {
            const cid = i?.Category?.id;
            if (cid == null) return;
            if (!itemsByCatId.has(cid)) itemsByCatId.set(cid, []);
            itemsByCatId.get(cid).push(i);
        });

        const hasCategoryContent = (catId) => {
            const hasItems = (itemsByCatId.get(catId) || []).length > 0;
            const hasGroups = itemGroups.some((g) => {
                const child = (g.itemIds || [])
                    .map((id) => items.find((i) => i?.id === id))
                    .find(Boolean);
                return child?.Category?.id === catId;
            });
            return hasItems || hasGroups;
        };

        const sections = [];
        for (const top of topLevel) {
            if (top.is_main) {
                if (hasCategoryContent(top.id)) {
                    sections.push({
                        key: `cat-${top.id}`,
                        catId: top.id,
                        catName: top.name,
                        parentName: null,
                    });
                }
                const subs = sortByDisplayOrder(
                    cats.filter((c) => c.parent_id === top.id),
                    (c) => c.index,
                    (c) => c.name,
                );
                for (const sub of subs) {
                    if (hasCategoryContent(sub.id)) {
                        sections.push({
                            key: `cat-${sub.id}`,
                            catId: sub.id,
                            catName: sub.name,
                            parentName: top.name,
                        });
                    }
                }
            } else if (hasCategoryContent(top.id)) {
                sections.push({
                    key: `cat-${top.id}`,
                    catId: top.id,
                    catName: top.name,
                    parentName: null,
                });
            }
        }

        const otherItems = items.filter((i) => !i?.Category?.id);
        if (otherItems.length > 0) {
            sections.push({ key: "cat-other", catId: null, catName: "Other", parentName: null });
        }

        return sections;
    }, [categoryRows, items, itemGroups]);

    const categorySectionKeys = orderedCategorySections.map((s) => s.key);

    const uncategorizedGroups = sortByDisplayOrder(
        itemGroups.filter((g) => {
            const firstChild = (g.itemIds || [])
                .map((id) => items.find((i) => i?.id === id))
                .find(Boolean);
            const catId = firstChild?.Category?.id;
            return !catId || !orderedCategorySections.some((s) => s.catId === catId);
        }),
        (g) => g.index,
        (g) => g.name,
    );

    useEffect(() => {
        if (categorySectionKeys.length > 0) {
            const defaultState = {};
            categorySectionKeys.forEach((key) => {
                if (collapsedCategories[key] === undefined) defaultState[key] = true;
            });
            setCollapsedCategories((prev) => ({ ...prev, ...defaultState }));
        }
    }, [categorySectionKeys.join(",")]);

    const formatFlag = useCallback((flag) => {
        let text = typeof flag === "string" ? flag : (flag?.id || "");
        return text.split("_").join(" ");
    }, []);

    const toggleItemSelection = useCallback((itemId) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }, []);

    // 🧠 动态处理阻碍 position: sticky 生效的祖先元素 overflow 样式
    useEffect(() => {
        if (selectedItemIds.size === 0) return;

        const modifiedElements = [];

        const timer = setTimeout(() => {
            const bar = document.querySelector('.bulk-action-bar');
            if (!bar) return;

            let parent = bar.parentElement;
            while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent);
                if (
                    style.overflow !== 'visible' ||
                    style.overflowX !== 'visible' ||
                    style.overflowY !== 'visible'
                ) {
                    // 保存原样式和元素引用
                    modifiedElements.push({
                        element: parent,
                        overflow: parent.style.overflow,
                        overflowX: parent.style.overflowX,
                        overflowY: parent.style.overflowY
                    });
                    
                    // 将阻碍 sticky 效果的 overflow 临时改为 visible
                    parent.style.setProperty('overflow', 'visible', 'important');
                }
                parent = parent.parentElement;
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            // 还原所有被临时修改过样式的祖先元素
            modifiedElements.forEach(({ element, overflow, overflowX, overflowY }) => {
                if (element) {
                    if (overflow) element.style.setProperty('overflow', overflow);
                    else element.style.removeProperty('overflow');
                    
                    if (overflowX) element.style.setProperty('overflow-x', overflowX);
                    else element.style.removeProperty('overflow-x');
                    
                    if (overflowY) element.style.setProperty('overflow-y', overflowY);
                    else element.style.removeProperty('overflow-y');
                }
            });
        };
    }, [selectedItemIds.size > 0]);

    const clearSelection = useCallback(() => setSelectedItemIds(new Set()), []);

    const toggleCategorySelection = useCallback((itemIds, selectAll) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            itemIds.forEach((id) => {
                if (selectAll) next.add(id);
                else next.delete(id);
            });
            return next;
        });
    }, []);

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        const willRemove = await swal({
            title: t("all_prod.bulk.delete_confirm_title"),
            text: t("all_prod.bulk.delete_confirm_desc", { count: ids.length }),
            icon: "warning",
            buttons: true,
            dangerMode: true,
        });
        if (!willRemove) return;
        setBulkLoading(true);
        const result = await dispatch(bulkDeleteItemsThunk(ids));
        setBulkLoading(false);
        if (result?.ok) {
            clearSelection();
            swal({ title: t("all_prod.bulk.success_delete"), text: t("all_prod.bulk.success_delete_desc", { count: result.deletedCount ?? ids.length }), icon: "success" });
        } else {
            swal({ title: t("all_prod.bulk.error"), text: result?.message || t("all_prod.bulk.error_desc"), icon: "error" });
        }
    };

    const handleBulkPriceSubmit = async () => {
        const ids = Array.from(selectedItemIds);
        const price = Number(bulkPrice);
        if (ids.length === 0) return;
        if (bulkPrice === "" || !Number.isFinite(price) || price < 0) {
            swal({ title: t("all_prod.bulk.error"), text: t("all_prod.bulk.invalid_price"), icon: "warning" });
            return;
        }
        setBulkLoading(true);
        const result = await dispatch(bulkUpdatePriceThunk(ids, price));
        setBulkLoading(false);
        if (result?.ok) {
            setShowBulkPriceModal(false);
            setBulkPrice("");
            clearSelection();
            swal({ title: t("all_prod.bulk.success_price"), text: t("all_prod.bulk.success_price_desc", { count: result.updatedCount ?? ids.length }), icon: "success" });
        } else {
            swal({ title: t("all_prod.bulk.error"), text: result?.message || t("all_prod.bulk.error_desc"), icon: "error" });
        }
    };

    const buildBulkStatusUpdates = () => {
        const updates = {};
        if (bulkStatus.sold_out !== "") updates.sold_out = bulkStatus.sold_out === "true";
        if (bulkStatus.hidden !== "") updates.hidden = bulkStatus.hidden === "true";
        if (bulkStatus.hot_item !== "") updates.hot_item = bulkStatus.hot_item === "true";
        if (bulkStatus.new_item !== "") updates.new_item = bulkStatus.new_item === "true";
        if (bulkStatus.must_order !== "") updates.must_order = bulkStatus.must_order === "true";
        return updates;
    };

    const handleBulkStatusSubmit = async () => {
        const ids = Array.from(selectedItemIds);
        const updates = buildBulkStatusUpdates();
        if (ids.length === 0) return;
        if (Object.keys(updates).length === 0) {
            swal({ title: t("all_prod.bulk.error"), text: t("all_prod.bulk.status_none"), icon: "warning" });
            return;
        }
        setBulkLoading(true);
        const result = await dispatch(bulkUpdateItemsThunk(ids, updates));
        setBulkLoading(false);
        if (result?.ok) {
            setShowBulkStatusModal(false);
            setBulkStatus({ sold_out: "", hidden: "", hot_item: "", new_item: "", must_order: "" });
            clearSelection();
            swal({ title: t("all_prod.bulk.success_status"), text: t("all_prod.bulk.success_status_desc", { count: result.updatedCount ?? ids.length }), icon: "success" });
        } else {
            swal({ title: t("all_prod.bulk.error"), text: result?.message || t("all_prod.bulk.error_desc"), icon: "error" });
        }
    };

    const handleBulkCategorySubmit = async () => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        if (!bulkCategoryId) {
            swal({ title: t("all_prod.bulk.error"), text: t("all_prod.bulk.category_required"), icon: "warning" });
            return;
        }
        setBulkLoading(true);
        const result = await dispatch(bulkUpdateItemsThunk(ids, { category_id: Number(bulkCategoryId) }));
        setBulkLoading(false);
        if (result?.ok) {
            setShowBulkCategoryModal(false);
            setBulkCategoryId("");
            clearSelection();
            swal({ title: t("all_prod.bulk.success_category"), text: t("all_prod.bulk.success_category_desc", { count: result.updatedCount ?? ids.length }), icon: "success" });
        } else {
            swal({ title: t("all_prod.bulk.error"), text: result?.message || t("all_prod.bulk.error_desc"), icon: "error" });
        }
    };

    const sortedCategories = sortByDisplayOrder(
        categoryRows || [],
        (c) => c.index,
        (c) => c.name,
    );

    const handleExportExcel = () => {
        if (!items.length) return;
        const catOrder = new Map(
            orderedCategorySections.map((s, i) => [s.catId ?? "other", i])
        );
        const rows = [...items]
            .sort((a, b) => {
                const ca = catOrder.get(a?.Category?.id ?? "other") ?? 9999;
                const cb = catOrder.get(b?.Category?.id ?? "other") ?? 9999;
                if (ca !== cb) return ca - cb;
                return compareDisplayOrder(a, b);
            })
            .map((item) => {
                const modifiers = [...(item?.Restaurant_Item_Attributes || [])]
                    .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0))
                    .map((attr) => {
                        const attrName = attr?.Item_Attribute?.name || "";
                        if (!attrName) return null;
                        
                        const fullAttr = attributes.find((a) => a.id === attr?.Item_Attribute?.id);
                        const options = [...(fullAttr?.Item_Attribute_Options || [])]
                            .sort((o1, o2) => (o1?.index ?? 0) - (o2?.index ?? 0))
                            .map((opt) => {
                                const priceNum = Number(opt?.price_modifier);
                                let priceText = "";
                                if (!isNaN(priceNum) && priceNum !== 0) {
                                    priceText = priceNum > 0 ? ` (+$${priceNum})` : ` (-$${Math.abs(priceNum)})`;
                                }
                                return `${opt?.name || ""}${priceText}`;
                            })
                            .filter(Boolean);
                            
                        if (options.length > 0) {
                            return `${attrName} [${options.join(", ")}]`;
                        }
                        return attrName;
                    })
                    .filter(Boolean);
                const specialAttrs = (item?.special_attributes || [])
                    .map((attr) => attr?.name)
                    .filter(Boolean);
                const tags = [
                    ...(item?.Ingredients || []).map((ing) => ing?.name).filter(Boolean),
                    ...(item?.flags || []).map((flag) => formatFlag(flag)).filter(Boolean),
                ];

                return {
                    [t("all_prod.export.col_category")]: item?.Category?.name || t("all_prod.export.uncategorized"),
                    [t("all_prod.export.col_name")]: item?.name || "",
                    [t("all_prod.export.col_chinese")]: item?.chinese_name || "",
                    [t("all_prod.export.col_price")]: Number(item?.price) || 0,
                    [t("all_prod.export.col_status")]: [
                        item?.sold_out && t("all_prod.badges.sold_out"),
                        item?.hidden && t("all_prod.badges.hidden"),
                        item?.hot_item && t("all_prod.badges.hot"),
                        item?.menu_only && t("all_prod.badges.menu"),
                        item?.market_price && t("all_prod.badges.market"),
                        item?.new_item && "New",
                        item?.must_order && "Must Order",
                    ].filter(Boolean).join(", "),
                    [t("all_prod.export.col_modify")]: modifiers.join(", "),
                    [t("all_prod.export.col_special")]: specialAttrs.join(", "),
                    [t("all_prod.export.col_tags")]: tags.join(", "),
                };
            });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
            { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 22 },
            { wch: 24 }, { wch: 24 }, { wch: 24 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Menu");
        XLSX.writeFile(wb, `menu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleBulkModifySubmit = async () => {
        const ids = Array.from(selectedItemIds);
        const attributeIds = bulkModifyAttributes.map((a) => a.value);
        if (ids.length === 0) return;
        if (attributeIds.length === 0 && bulkModifyMode !== "replace") {
            swal({ title: t("all_prod.bulk.error"), text: t("all_prod.bulk.modify_none"), icon: "warning" });
            return;
        }
        setBulkLoading(true);
        const result = await dispatch(bulkSetAttributesThunk(ids, attributeIds, bulkModifyMode));
        setBulkLoading(false);
        if (result?.ok) {
            setShowBulkModifyModal(false);
            setBulkModifyAttributes([]);
            setBulkModifyMode("add");
            clearSelection();
            swal({
                title: t("all_prod.bulk.success_modify"),
                text: t("all_prod.bulk.success_modify_desc", {
                    items: result.itemCount ?? ids.length,
                    created: result.createdCount ?? 0,
                    removed: result.removedCount ?? 0,
                }),
                icon: "success",
            });
        } else {
            swal({ title: t("all_prod.bulk.error"), text: result?.message || t("all_prod.bulk.error_desc"), icon: "error" });
        }
    };

    const handleEdit = (item) => { setSelectEditItem(item); setShowEditModal(true); };
    const handleAttribute = (item) => {
        setSelectEditItem(item);
        const mappedAttributes = mapItemAttributesForSelect(item);
        setSelectedAttributes(mappedAttributes);
        const nextNestedMap = {};
        mappedAttributes.forEach((attr) => {
            const fullAttr = attributes.find((a) => a.id === attr.value);
            (fullAttr?.Item_Attribute_Options || []).forEach((opt) => {
                nextNestedMap[opt.id] = Array.isArray(opt?.nested_attribute_ids) ? opt.nested_attribute_ids : [];
            });
        });
        setOptionNestedMap(nextNestedMap);
        const sorted = [...mappedAttributes].sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0));
        setActiveModifierId(sorted[0]?.value ?? null);
        setShowAttributeModal(true);
    };
    const handleSpecial = (item) => {
        setSelectEditItem(item);
        const mapped = item?.special_attributes?.map(a => ({ value: a.id, label: a.name })) || [];
        setSelectedSpecialAttributes(mapped);
        setShowSpecialAttributeModal(true);
    };
    const handleDelete = async (item) => {
        const willRemove = await swal({
            title: t("all_prod.swal.remove_title"),
            text: t("all_prod.swal.remove_desc", { name: item.name }),
            icon: "warning",
            buttons: true,
            dangerMode: true,
        });
        if (willRemove) dispatch(deleteItemThunk(item));
    };

    const handleRestoreDeletedItem = async (item) => {
        if (item.category_id != null) {
            const result = await dispatch(restoreItemThunk(item));
            if (result && !result.ok) {
                swal({ title: t("all_prod.alerts.fail_restore"), text: result.message, icon: "error" });
            }
            return;
        }
        setRestorePickItem(item);
        setRestorePickCategoryId("");
        await dispatch(getCategoriesThunk());
        setShowRestoreCategoryModal(true);
    };

    const confirmRestoreWithCategory = async () => {
        if (!restorePickItem) return;
        if (!restorePickCategoryId) {
            swal({ title: t("all_prod.alerts.req_category"), text: t("all_prod.alerts.req_category_desc"), icon: "warning" });
            return;
        }
        const result = await dispatch(
            restoreItemThunk(restorePickItem, restorePickCategoryId)
        );
        if (result?.ok) {
            setShowRestoreCategoryModal(false);
            setRestorePickItem(null);
            setRestorePickCategoryId("");
        } else {
            swal({ title: t("all_prod.alerts.fail_restore"), text: result?.message || t("all_prod.alerts.fail_restore_desc"), icon: "error" });
        }
    };

    const openDeletedModal = () => {
        setShowDeletedModal(true);
        dispatch(getDeletedItemsThunk());
    };

    const sortedSelectedAttributes = useMemo(
        () =>
            [...selectedAttributes].sort(
                (a, b) => (a?.index ?? 0) - (b?.index ?? 0),
            ),
        [selectedAttributes],
    );

    const handleAttributeIndexChange = useCallback((attrValue, newIndex) => {
        if (!selectEditItem?.id) return;
        const val = Math.max(0, Number(newIndex) || 0);

        setSelectedAttributes((prev) =>
            prev
                .map((a) =>
                    Number(a.value) === Number(attrValue) ? { ...a, index: val } : a,
                )
                .sort((a, b) => (a?.index ?? 0) - (b?.index ?? 0)),
        );

        dispatch(upsertItemAttributeThunk(selectEditItem.id, attrValue, val));
    }, [dispatch, selectEditItem?.id]);

    const reorderAttributePriority = useCallback((attrValue, delta) => {
        if (!selectEditItem?.id) return;

        const sorted = [...selectedAttributes].sort(
            (a, b) => (a?.index ?? 0) - (b?.index ?? 0),
        );
        const fromIdx = sorted.findIndex(
            (a) => Number(a.value) === Number(attrValue),
        );
        if (fromIdx < 0) return;

        const toIdx = fromIdx + delta;
        if (toIdx < 0 || toIdx >= sorted.length) return;

        const next = [...sorted];
        [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
        const reindexed = next.map((a, i) => ({ ...a, index: i }));

        setSelectedAttributes(reindexed);
        reindexed.forEach((a) => {
            dispatch(upsertItemAttributeThunk(selectEditItem.id, a.value, a.index));
        });
    }, [dispatch, selectEditItem?.id, selectedAttributes]);

    const syncAttributes = (newOptions) => {
        const options = newOptions || [];
        if (!selectEditItem) return;

        const prevById = new Map(
            selectedAttributes.map((a) => [Number(a.value), a]),
        );
        const oldIdSet = new Set(
            selectedAttributes.map((a) => Number(a.value)),
        );
        const newIdSet = new Set(options.map((o) => Number(o.value)));

        // Next item-attachment index = one past the highest already on this item
        let nextIndex =
            selectedAttributes.reduce((max, a) => {
                const n = Number(a.index);
                return Math.max(max, Number.isFinite(n) ? n : -1);
            }, -1) + 1;

        // Keep existing attachment indexes; assign 0, 1, 2… in add order for new ones
        const normalized = options.map((opt) => {
            const existing = prevById.get(Number(opt.value));
            if (existing) {
                const n = Number(existing.index);
                return {
                    value: opt.value,
                    label: opt.label,
                    index: Number.isFinite(n) ? n : 0,
                };
            }
            return {
                value: opt.value,
                label: opt.label,
                index: nextIndex++,
            };
        });

        normalized.forEach((opt) => {
            if (!oldIdSet.has(Number(opt.value))) {
                dispatch(
                    upsertItemAttributeThunk(
                        selectEditItem.id,
                        opt.value,
                        opt.index,
                    ),
                );
            }
        });

        selectedAttributes.forEach((opt) => {
            if (!newIdSet.has(Number(opt.value))) {
                dispatch(
                    deleteItemAttributeThunk(selectEditItem.id, opt.value),
                );
            }
        });

        const sorted = [...normalized].sort(
            (a, b) => (a.index ?? 0) - (b.index ?? 0),
        );
        setSelectedAttributes(sorted);

        if (!sorted.some((a) => Number(a.value) === Number(activeModifierId))) {
            setActiveModifierId(sorted[0]?.value ?? null);
        }
    };

    const getAttrOptions = (attributeId) => {
        const fullAttr = attributes.find((a) => a.id === attributeId);
        return fullAttr?.Item_Attribute_Options || [];
    };

    const handleOptionNestedChange = async (optionId, nestedIds) => {
        if (!selectEditItem) return;
        setOptionNestedMap((prev) => ({ ...prev, [optionId]: nestedIds }));
        await dispatch(upsertOptionNestedAttributesThunk(selectEditItem.id, optionId, nestedIds));
    };

    const syncSpecialAttributes = (newOptions) => {
        const options = newOptions || [];
        if (!selectEditItem) return;
        const oldIds = selectedSpecialAttributes.map(a => a.value);
        const newIds = options.map(o => o.value);
        options.forEach(opt => {
            if (!oldIds.includes(opt.value)) dispatch(upsertItemSpecialAttributeThunk(selectEditItem.id, opt.value));
        });
        selectedSpecialAttributes.forEach(opt => {
            if (!newIds.includes(opt.value)) dispatch(deleteItemSpecialAttributeThunk(selectEditItem.id, opt.value));
        });
        setSelectedSpecialAttributes(options);
    };

    return (
        <div className="container-fluid py-4">
            <style>{`
                .item-row-hover { cursor: pointer; transition: background 0.15s ease; }
                .item-row-hover:hover { background-color: #f1f5f9 !important; }
                .btn-icon-soft { border: none; background: #f1f5f9; color: #475569; margin: 0 2px; }
                .btn-icon-soft:hover { background: #e2e8f0; color: #1e293b; }
                .cat-header { background: #ffffff !important; border-left: 5px solid #dd2f6e !important; transition: 0.3s; }
                .cat-header:hover { background: #f8fafc !important; }
                .health-card { cursor: pointer; transition: 0.2s; border: none; }
                .health-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }
                .health-card.active { border-bottom: 3px solid #dd2f6e !important; background: #fce7f0; }
                .menu-status-dot { font-size: 8px; vertical-align: middle; margin-right: 6px; }
                .content-wrapper { position: relative; min-height: 400px; }
                .content-loading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.95); z-index: 100; display: flex; justify-content: center; align-items: center; border-radius: 8px; backdrop-filter: blur(2px); }
                .bulk-action-bar { 
                    background: #fce7f0; 
                    border: 1px solid #c7d2fe; 
                    border-radius: 12px; 
                    padding: 12px 16px; 
                    margin-bottom: 16px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    flex-wrap: wrap; 
                    gap: 12px; 
                    position: sticky;
                    top: 7.5rem;
                    z-index: 2;
                    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -1px rgba(99, 102, 241, 0.06);
                    transition: top 0.2s ease;
                }
                @media only screen and (max-width: 1199px) {
                    .bulk-action-bar {
                        top: 5rem;
                    }
                }
            `}</style>

            <div className="content-wrapper">
                {loading && (
                    <div className="content-loading-overlay">
                        <Spinner animation="border" variant="indigo" />
                    </div>
                )}

                {/* Health Bar (Compact Size) */}
            <Row className="mb-4 gx-3">
                <Col md={4}>
                    <Card className={`health-card shadow-sm rounded-3 ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
                        <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-2 text-primary"><FaBoxOpen /></div>
                                <span className="small fw-bold text-muted uppercase">{t("all_prod.stats.inventory")}</span>
                            </div>
                            <h5 className="mb-0 fw-bold">{stats.total}</h5>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className={`health-card shadow-sm rounded-3 ${filterStatus === 'sold_out' ? 'active' : ''}`} onClick={() => setFilterStatus('sold_out')}>
                        <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-danger bg-opacity-10 p-2 rounded-2 text-danger"><FaExclamationTriangle /></div>
                                <span className="small fw-bold text-muted uppercase">{t("all_prod.stats.sold_out")}</span>
                            </div>
                            <h5 className="mb-0 fw-bold text-danger">{stats.soldOut}</h5>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className={`health-card shadow-sm rounded-3 ${filterStatus === 'hidden' ? 'active' : ''}`} onClick={() => setFilterStatus('hidden')}>
                        <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-secondary bg-opacity-10 p-2 rounded-2 text-secondary"><FaEyeSlash /></div>
                                <span className="small fw-bold text-muted uppercase">{t("all_prod.stats.hidden")}</span>
                            </div>
                            <h5 className="mb-0 fw-bold">{stats.hidden}</h5>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Menu Header Status Line */}
            <div className="row mb-4 px-1 align-items-center">
                <div className="col-md-8">
                    <h3 className="fw-bold text-slate-800 mb-0">{t("all_prod.header.title")}</h3>
                    <div className="d-flex align-items-center flex-wrap gap-2 mt-1">
                        <span className="text-success small fw-bold">
                            <FaCircle className="menu-status-dot" /> {t("all_prod.header.live_menu")}
                        </span>
                        <span className="text-muted opacity-50">|</span>
                        <span className="text-muted small fw-medium">{t("all_prod.header.categories_groups_pre")} <strong>{orderedCategorySections.length}</strong> {t("all_prod.header.categories")} • <strong>{itemGroups.length}</strong> {t("all_prod.header.groups")}</span>
                        <span className="text-muted opacity-50">·</span>
                        <button type="button" className="btn btn-link p-0 text-muted small text-decoration-none opacity-75" onClick={openDeletedModal} style={{ fontSize: '0.8rem' }} title="Removed items (restore here)">
                            {t("all_prod.header.deleted")}{deletedItems.length > 0 ? ` (${deletedItems.length})` : ''}
                        </button>
                    </div>
                </div>
                <div className="col-md-4 text-end d-flex justify-content-end gap-2 d-sm-none mt-3 mt-md-0">
                    <Button variant="primary" className="fw-bold shadow-sm px-4 rounded-pill" onClick={() => dispatch(setShowAddModal(true))}>
                        <FaPlus className="me-2" /> {t("all_prod.header.add_prod")}
                    </Button>
                    <Button variant="outline-primary" className="fw-bold shadow-sm px-4 rounded-pill" onClick={() => dispatch(setShowCreateGroupModal(true))}>
                        New Group
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-0 mb-4 rounded-4" >
                <Card.Body className="p-2">
                    <div className="d-flex gap-2 align-items-center">
                        <InputGroup className="border-0 bg-white rounded-pill px-3 py-1 flex-grow-1">
                            <InputGroup.Text className="bg-light border-0"><FaSearch className="text-muted" /></InputGroup.Text>
                            <Form.Control className="bg-light border-0 shadow-none" placeholder={t("all_prod.search.ph")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </InputGroup>
                        <Button variant="white" className="rounded-pill px-3 text-secondary border shadow-none" onClick={() => {
                            const newState = !expandAllState;
                            const updated = {};
                            categorySectionKeys.forEach((key) => { updated[key] = newState; });
                            setCollapsedCategories(updated);
                            setExpandAllState(newState);
                        }}>
                            {expandAllState ? t("all_prod.search.collapse_all") : t("all_prod.search.expand_all")}
                        </Button>
                        <Button variant="white" className="rounded-pill px-3 text-success border shadow-none text-nowrap" onClick={handleExportExcel} disabled={!items.length}>
                            <FaFileExcel className="me-2" />{t("all_prod.export.btn")}
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {selectedItemIds.size > 0 && (
                <div className="bulk-action-bar">
                    <span className="fw-semibold text-primary">
                        {t("all_prod.bulk.selected", { count: selectedItemIds.size })}
                    </span>
                    <div className="d-flex flex-wrap gap-2">
                        <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={clearSelection} disabled={bulkLoading}>
                            {t("all_prod.bulk.clear_selection")}
                        </Button>
                        <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => setShowBulkPriceModal(true)} disabled={bulkLoading}>
                            {t("all_prod.bulk.change_price")}
                        </Button>
                        <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => setShowBulkStatusModal(true)} disabled={bulkLoading}>
                            {t("all_prod.bulk.change_status")}
                        </Button>
                        <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => setShowBulkCategoryModal(true)} disabled={bulkLoading}>
                            {t("all_prod.bulk.move_category")}
                        </Button>
                        <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => setShowBulkModifyModal(true)} disabled={bulkLoading}>
                            {t("all_prod.bulk.set_modify")}
                        </Button>
                        <Button variant="danger" size="sm" className="rounded-pill" onClick={handleBulkDelete} disabled={bulkLoading}>
                            {bulkLoading ? <Spinner size="sm" animation="border" /> : <><FaTrash className="me-1" />{t("all_prod.bulk.delete")}</>}
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-4 shadow-sm border-0 overflow-hidden">
                <Table responsive hover className="mb-0 align-middle border-0">
                    <thead className="bg-slate-50 border-bottom">
                        <tr className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
                            <th className="text-center py-3" style={{ width: '44px' }}></th>
                            <th className="text-center py-3" style={{ width: '90px' }}>{t("all_prod.table.th_order")}</th>
                            <th style={{ width: '90px' }}>{t("all_prod.table.th_media")}</th>
                            <th>{t("all_prod.table.th_info")}</th>
                            <th style={{ minWidth: '220px' }}>{t("all_prod.table.th_status")}</th>
                            <th className="text-end pe-4">{t("all_prod.table.th_actions")}</th>
                        </tr>
                    </thead>
                    
                    {orderedCategorySections.map((section) => {
                        const { key: sectionKey, catId, catName, parentName } = section;
                        const searchLower = searchTerm.toLowerCase();
                        const itemMatchesCurrentFilter = (item) => {
                            if (!item) return false;
                            const matchesSearch =
                                !searchLower ||
                                item?.name?.toLowerCase()?.includes(searchLower) ||
                                item?.chinese_name?.toLowerCase()?.includes(searchLower);
                            if (!matchesSearch) return false;
                            if (filterStatus === "sold_out") return !!item?.sold_out;
                            if (filterStatus === "hidden") return !!item?.hidden;
                            return true;
                        };

                        let rawCatItems = items.filter((i) => {
                            const inCat = catId == null
                                ? !i?.Category?.id
                                : i?.Category?.id === catId;
                            return inCat && itemMatchesCurrentFilter(i);
                        });

                        const groupedItemIds = new Set(itemGroups.flatMap((g) => g.itemIds || []));
                        const catGroups = itemGroups
                            .map((group) => {
                                const groupItems = sortByDisplayOrder(
                                    (group?.itemIds || []).map((id) => items.find((i) => i?.id === id)).filter(Boolean),
                                    (i) => i.index,
                                    (i) => i.name,
                                );
                                const sample = groupItems[0];
                                const inCat = catId == null
                                    ? !sample?.Category?.id
                                    : sample?.Category?.id === catId;
                                if (!inCat) return null;

                                const matchedGroupItems = sortByDisplayOrder(
                                    groupItems.filter(itemMatchesCurrentFilter),
                                    (i) => i.index,
                                    (i) => i.name,
                                );
                                const groupNameMatches = !searchLower || group?.name?.toLowerCase()?.includes(searchLower);
                                const showGroup = groupNameMatches || matchedGroupItems.length > 0;
                                if (!showGroup) return null;

                                return {
                                    ...group,
                                    __visibleItems: matchedGroupItems,
                                };
                            })
                            .filter(Boolean);

                        const standaloneItems = sortByDisplayOrder(
                            rawCatItems.filter((i) => !groupedItemIds.has(i.id)),
                            (i) => i.index,
                            (i) => i.name,
                        );

                        const categoryEntries = [
                            ...catGroups.map((group) => ({ kind: "group", entity: group })),
                            ...standaloneItems.map((item) => ({ kind: "item", entity: item })),
                        ].sort((a, b) => compareDisplayOrder(a.entity, b.entity));

                        if (categoryEntries.length === 0) return null;

                        const selectableIdsInCategory = [];
                        categoryEntries.forEach((entry) => {
                            if (entry.kind === "item") selectableIdsInCategory.push(entry.entity.id);
                            if (entry.kind === "group") {
                                (entry.entity.__visibleItems || []).forEach((item) => selectableIdsInCategory.push(item.id));
                            }
                        });
                        const allCatSelected = selectableIdsInCategory.length > 0 && selectableIdsInCategory.every((id) => selectedItemIds.has(id));
                        const someCatSelected = selectableIdsInCategory.some((id) => selectedItemIds.has(id));

                        return (
                            <tbody key={sectionKey} className="border-0">
                                <tr className="cat-header cursor-pointer" onClick={() => setCollapsedCategories(p => ({...p, [sectionKey]: !p[sectionKey]}))}>
                                    <td colSpan={6} className="py-3 px-4 fw-bold">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center text-slate-700 fs-6">
                                                {!collapsedCategories[sectionKey] && selectableIdsInCategory.length > 0 && (
                                                    <span className="me-2" onClick={(e) => e.stopPropagation()}>
                                                        <CategorySelectCheckbox
                                                            checked={allCatSelected}
                                                            indeterminate={someCatSelected}
                                                            onChange={() => toggleCategorySelection(selectableIdsInCategory, !allCatSelected)}
                                                            label={`Select all in ${catName}`}
                                                        />
                                                    </span>
                                                )}
                                                {collapsedCategories[sectionKey] ? <FaChevronRight className="me-2 text-primary" size={12}/> : <FaChevronDown className="me-2 text-primary" size={12}/>}
                                                <span>
                                                    {catName}
                                                    {parentName && <span className="text-muted small ms-2">({parentName})</span>}
                                                </span>
                                            </div>
                                            <Badge bg="indigo-soft" className="text-primary rounded-pill px-3 py-2 fw-medium border border-primary border-opacity-10">
                                                {categoryEntries.length} {t("all_prod.table.items")}
                                            </Badge>
                                        </div>
                                    </td>
                                </tr>

                                {!collapsedCategories[sectionKey] && (
                                    <Fragment>
                                        {categoryEntries.map((entry) => entry.kind === "group" ? (
                                            <Fragment key={`group-${entry.entity.id}`}>
                                                <tr className="bg-white border-bottom item-row-hover" onClick={() => setExpandedGroups(prev => ({ ...prev, [entry.entity.id]: !prev[entry.entity.id] }))} style={{ cursor: "pointer" }}>
                                                    <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}></td>
                                                    <td className="text-center text-muted fw-bold small" style={{ fontSize: "0.65rem" }}>{formatDisplayIndex(entry.entity.index)}</td>
                                                    <td className="text-center py-3">
                                                        <img src={entry.entity.imageUrl || PLACEHOLDER_IMAGE} className="rounded-3 border border-2 border-primary border-opacity-25 shadow-sm" style={{ width: "50px", height: "50px", objectFit: "cover" }} alt="" />
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                            {expandedGroups[entry.entity.id] ? <FaChevronDown className="text-primary" size={14}/> : <FaChevronRight className="text-primary" size={14}/>}
                                                            <div className="fw-bold fs-6 text-slate-800">{entry.entity.name}</div>
                                                            <Badge bg="light" text="primary" className="border border-primary border-opacity-10 rounded-pill px-2 py-0" style={{ fontSize: "0.65rem" }}>{t("all_prod.table.grp")}</Badge>
                                                        </div>
                                                        <Badge bg="light" text="primary" className="border border-primary border-opacity-10 rounded-pill px-2">
                                                            <FaLayerGroup size={10} className="me-1" /> {entry.entity.__visibleItems?.length || 0} {t("all_prod.table.items_caps")}
                                                        </Badge>
                                                    </td>
                                                    <td><span className="text-slate-400 small fw-semibold">{t("all_prod.table.grp_settings")}</span></td>
                                                    <td className="text-end pe-4">
                                                        <Button variant="outline-primary" size="sm" className="fw-bold rounded-pill shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedGroup(entry.entity); setShowEditGroupModal(true); }}>
                                                            Edit Group
                                                        </Button>
                                                    </td>
                                                </tr>
                                                {expandedGroups[entry.entity.id] && (entry.entity.__visibleItems || []).map(item => (
                                                    <SubItemRow key={`sub-${item?.id}`} item={item} onEdit={handleEdit} onAttribute={handleAttribute} onSpecial={handleSpecial} onDelete={handleDelete} formatFlag={formatFlag} selected={selectedItemIds.has(item.id)} onToggleSelect={toggleItemSelection} />
                                                ))}
                                            </Fragment>
                                        ) : (
                                            <tr key={entry.entity.id} className="item-row-hover border-bottom" onClick={() => handleEdit(entry.entity)}>
                                                <ItemSelectCheckbox itemId={entry.entity.id} selected={selectedItemIds.has(entry.entity.id)} onToggle={toggleItemSelection} />
                                                <td className="text-center text-muted fw-bold small" style={{ fontSize: "0.65rem" }}>{formatDisplayIndex(entry.entity.index)}</td>
                                                <td className="py-3"><img src={entry.entity?.image_url || PLACEHOLDER_IMAGE} className="rounded-3 border shadow-sm" style={{ width: "50px", height: "50px", objectFit: "cover" }} alt="" /></td>
                                                <td>
                                                    <div className="fw-bold fs-6 text-slate-800">{entry.entity?.name}</div>
                                                    <div className="text-slate-500 small mb-2">{entry.entity?.chinese_name}</div>
                                                    
                                                    {/* LARGER OPTIONS DISPLAY */}
                                                    <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                                                        {sortItemModifiers(entry.entity?.Restaurant_Item_Attributes).map((attr, idx) => (
                                                            <Badge key={`r-${attr?.Item_Attribute?.id ?? idx}`} bg="light" text="dark" className="border fw-medium px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                {attr?.Item_Attribute?.name}
                                                            </Badge>
                                                        ))}
                                                        {entry.entity?.special_attributes?.map((attr, idx) => (
                                                            <Badge key={`s-${idx}`} bg="indigo-soft" className="text-primary border border-primary border-opacity-10 fw-bold px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                <FaTools size={10} className="me-1"/>{attr?.name}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    <div className="d-flex flex-wrap gap-1 mt-2">
                                                        {entry.entity?.Ingredients?.map((ing, idx) => (
                                                            <Badge key={`ing-${idx}`} bg="info" className="fw-medium px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                                {ing?.icon && <span className="me-1">{ing.icon}</span>}
                                                                {ing?.name}
                                                            </Badge>
                                                        ))}
                                                        {entry.entity?.flags?.filter(f => {
                                                            // Hide "item" flag when menu_only is true
                                                            if (entry.entity?.menu_only) {
                                                                const flagStr = typeof f === "string" ? f : (f?.id || "");
                                                                return flagStr.toLowerCase() !== "item";
                                                            }
                                                            return true;
                                                        }).map((f, idx) => (
                                                            <Badge key={idx} bg="white" text="dark" className="border shadow-none fw-medium text-uppercase" style={{ fontSize: '8px' }}>{formatFlag(f)}</Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-wrap gap-2 align-items-center">
                                                        <span className="fw-bold fs-5 text-slate-900 me-2">${entry.entity?.price}</span>
                                                        {entry.entity?.market_price && <Badge bg="info" className="p-2 rounded-pill shadow-sm"><FaClock size={10} className="me-1"/>{t("all_prod.badges.market")}</Badge>}
                                                        {entry.entity?.hot_item && <Badge bg="danger" className="p-2 rounded-pill shadow-sm"><FaFire size={10} className="me-1"/>{t("all_prod.badges.hot")}</Badge>}
                                                        {entry.entity?.sold_out && <Badge bg="dark" className="p-2 rounded-pill shadow-sm">{t("all_prod.badges.sold_out")}</Badge>}
                                                        {entry.entity?.popular_category && <Badge bg="warning" text="dark" className="p-2 rounded-pill shadow-sm"><FaStar size={10} className="me-1"/>{t("all_prod.badges.popular")}</Badge>}
                                                        {entry.entity?.must_order && <Badge bg="primary" className="p-2 rounded-pill shadow-sm"><FaThumbsUp size={10} className="me-1"/>Must Order</Badge>}
                                                        {entry.entity?.menu_only && <Badge bg="secondary" className="p-2 rounded-pill shadow-sm">{t("all_prod.badges.menu")}</Badge>}
                                                        {entry.entity?.hidden && <Badge bg="secondary" className="p-2 rounded-pill shadow-sm">{t("all_prod.badges.hidden")}</Badge>}
                                                    </div>
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex justify-content-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="light" size="sm" className="btn-icon-soft" onClick={() => handleEdit(entry.entity)}><FaEdit /></Button>
                                                        <Button variant="light" size="sm" className="btn-icon-soft" onClick={() => handleAttribute(entry.entity)}><FaPlus /></Button>
                                                        <Button variant="light" size="sm" className="btn-icon-soft" onClick={() => handleSpecial(entry.entity)}><FaTags /></Button>
                                                        <Button variant="light" size="sm" className="btn-icon-soft" onClick={() => handleDelete(entry.entity)}><FaTrash /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                )}
                            </tbody>
                        );
                    })}
                    
                    {/* Uncategorized Catch All */}
                    {uncategorizedGroups.length > 0 && (
                         <tbody className="border-0">
                         <tr className="cat-header">
                             <td colSpan={6} className="py-3 px-4 fw-bold text-danger fs-6"><FaLayerGroup className="me-2"/>{t("all_prod.table.uncat_grps")}</td>
                         </tr>
                         {uncategorizedGroups.map(group => (
                             <Fragment key={`orphaned-${group.id}`}>
                                 <tr className="bg-white border-bottom item-row-hover" onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}>
                                     <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}></td>
                                     <td className="text-center text-muted fw-bold small" style={{ fontSize: "0.65rem" }}>{formatDisplayIndex(group.index)}</td>
                                     <td className="text-center py-3">
                                         <img src={group.imageUrl || PLACEHOLDER_IMAGE} className="rounded-3 border border-2 border-danger border-opacity-25" style={{ width: "50px", height: "50px", objectFit: "cover" }} alt="" />
                                     </td>
                                     <td><div className="fw-bold text-dark">{group.name}</div><small className="text-danger italic">{t("all_prod.table.no_cat")}</small></td>
                                     <td>--</td>
                                     <td className="text-end pe-4"><Button variant="outline-danger" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setShowEditGroupModal(true); }}>{t("all_prod.table.btn_edit_grp")}</Button></td>
                                 </tr>
                                 {expandedGroups[group.id] && sortByDisplayOrder(
                                     (group.itemIds || []).map((id) => items.find((i) => i?.id === id)).filter(Boolean),
                                     (i) => i.index,
                                     (i) => i.name,
                                 ).map(item => (
                                     <SubItemRow key={`sub-orph-${item?.id}`} item={item} onEdit={handleEdit} onAttribute={handleAttribute} onSpecial={handleSpecial} onDelete={handleDelete} formatFlag={formatFlag} selected={selectedItemIds.has(item.id)} onToggleSelect={toggleItemSelection} />
                                 ))}
                             </Fragment>
                         ))}
                     </tbody>
                    )}
                </Table>
            </div>

            <Modal show={showBulkStatusModal} centered onHide={() => !bulkLoading && setShowBulkStatusModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5">{t("all_prod.bulk.status_modal_title")}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">{t("all_prod.bulk.status_modal_desc", { count: selectedItemIds.size })}</p>
                    {[
                        { key: "sold_out", label: t("all_prod.bulk.field_sold_out") },
                        { key: "hidden", label: t("all_prod.bulk.field_hidden") },
                        { key: "hot_item", label: t("all_prod.bulk.field_hot") },
                        { key: "new_item", label: "New Item (新品)" },
                        { key: "must_order", label: "Must Order (本地必点)" },
                    ].map(({ key, label }) => (
                        <Form.Group key={key} className="mb-3">
                            <Form.Label className="small fw-bold">{label}</Form.Label>
                            <Form.Select
                                value={bulkStatus[key]}
                                onChange={(e) => setBulkStatus((prev) => ({ ...prev, [key]: e.target.value }))}
                                disabled={bulkLoading}
                            >
                                <option value="">{t("all_prod.bulk.status_skip")}</option>
                                <option value="true">{t("all_prod.bulk.status_on")}</option>
                                <option value="false">{t("all_prod.bulk.status_off")}</option>
                            </Form.Select>
                        </Form.Group>
                    ))}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="rounded-pill" onClick={() => setShowBulkStatusModal(false)} disabled={bulkLoading}>
                        {t("all_prod.bulk.cancel")}
                    </Button>
                    <Button variant="primary" className="rounded-pill" onClick={handleBulkStatusSubmit} disabled={bulkLoading}>
                        {bulkLoading ? <Spinner size="sm" animation="border" /> : t("all_prod.bulk.status_confirm")}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showBulkCategoryModal} centered onHide={() => !bulkLoading && setShowBulkCategoryModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5">{t("all_prod.bulk.category_modal_title")}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">{t("all_prod.bulk.category_modal_desc", { count: selectedItemIds.size })}</p>
                    <Form.Group>
                        <Form.Label className="small fw-bold">{t("all_prod.bulk.category_label")}</Form.Label>
                        <Form.Select
                            value={bulkCategoryId}
                            onChange={(e) => setBulkCategoryId(e.target.value)}
                            disabled={bulkLoading}
                        >
                            <option value="">{t("all_prod.modal_res.ph_cat")}</option>
                            {sortedCategories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="rounded-pill" onClick={() => setShowBulkCategoryModal(false)} disabled={bulkLoading}>
                        {t("all_prod.bulk.cancel")}
                    </Button>
                    <Button variant="primary" className="rounded-pill" onClick={handleBulkCategorySubmit} disabled={bulkLoading}>
                        {bulkLoading ? <Spinner size="sm" animation="border" /> : t("all_prod.bulk.category_confirm")}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showBulkModifyModal} centered size="lg" onHide={() => !bulkLoading && setShowBulkModifyModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5">{t("all_prod.bulk.modify_modal_title")}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">{t("all_prod.bulk.modify_modal_desc", { count: selectedItemIds.size })}</p>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">{t("all_prod.bulk.modify_mode_label")}</Form.Label>
                        <div className="d-flex flex-column gap-2">
                            <Form.Check
                                type="radio"
                                id="bulk-modify-add"
                                name="bulkModifyMode"
                                label={t("all_prod.bulk.modify_mode_add")}
                                checked={bulkModifyMode === "add"}
                                onChange={() => setBulkModifyMode("add")}
                                disabled={bulkLoading}
                            />
                            <Form.Check
                                type="radio"
                                id="bulk-modify-replace"
                                name="bulkModifyMode"
                                label={t("all_prod.bulk.modify_mode_replace")}
                                checked={bulkModifyMode === "replace"}
                                onChange={() => setBulkModifyMode("replace")}
                                disabled={bulkLoading}
                            />
                        </div>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className="small fw-bold">{t("all_prod.bulk.modify_select_label")}</Form.Label>
                        <Select
                            isMulti
                            components={animatedComponents}
                            options={(attributes || []).map((a) => ({ value: a.id, label: a.name }))}
                            value={bulkModifyAttributes}
                            onChange={(opts) => setBulkModifyAttributes(opts || [])}
                            isDisabled={bulkLoading}
                            placeholder={t("all_prod.bulk.modify_placeholder")}
                            styles={{ control: (base) => ({ ...base, borderRadius: "12px", padding: "4px" }) }}
                        />
                        {bulkModifyMode === "replace" && (
                            <Form.Text className="text-muted">{t("all_prod.bulk.modify_replace_hint")}</Form.Text>
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="rounded-pill" onClick={() => setShowBulkModifyModal(false)} disabled={bulkLoading}>
                        {t("all_prod.bulk.cancel")}
                    </Button>
                    <Button variant="primary" className="rounded-pill" onClick={handleBulkModifySubmit} disabled={bulkLoading}>
                        {bulkLoading ? <Spinner size="sm" animation="border" /> : t("all_prod.bulk.modify_confirm")}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showBulkPriceModal} centered onHide={() => !bulkLoading && setShowBulkPriceModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5">{t("all_prod.bulk.price_modal_title")}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">{t("all_prod.bulk.price_modal_desc", { count: selectedItemIds.size })}</p>
                    <Form.Group>
                        <Form.Label className="small fw-bold">{t("all_prod.bulk.price_label")}</Form.Label>
                        <Form.Control
                            type="number"
                            min="0"
                            step="0.01"
                            value={bulkPrice}
                            onChange={(e) => setBulkPrice(e.target.value)}
                            placeholder="0.00"
                            disabled={bulkLoading}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="rounded-pill" onClick={() => setShowBulkPriceModal(false)} disabled={bulkLoading}>
                        {t("all_prod.bulk.cancel")}
                    </Button>
                    <Button variant="primary" className="rounded-pill" onClick={handleBulkPriceSubmit} disabled={bulkLoading}>
                        {bulkLoading ? <Spinner size="sm" animation="border" /> : t("all_prod.bulk.price_confirm")}
                    </Button>
                </Modal.Footer>
            </Modal>

            <CreateItemGroupModal show={showCreateGroupModal} onHide={() => dispatch(setShowCreateGroupModal(false))} />
            <EditItemGroupModal show={showEditGroupModal} group={selectedGroup} onHide={() => setShowEditGroupModal(false)} />
            <AddProducts show={showAddModal} onHide={() => dispatch(setShowAddModal(false))} onSuccess={() => dispatch(getItemsThunk())} />
            <EditProducts showEditModal={showEditModal} setShowEditModal={setShowEditModal} selectedEditOption={() => setShowEditModal(false)} selectEditItem={selectEditItem} />
            
            <Modal
                show={showAttributeModal}
                centered
                size="xl"
                onHide={() => {
                    setShowAttributeModal(false);
                    setActiveModifierId(null);
                }}
                className="rounded-4"
            >
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold fs-5">
                        {t("all_prod.modal_attr.title")}
                        {selectEditItem?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Select
                        isMulti
                        components={animatedComponents}
                        options={attributes?.map((a) => ({
                            value: a.id,
                            label: a.name,
                        }))}
                        value={selectedAttributes}
                        onChange={syncAttributes}
                        styles={{
                            control: (base) => ({
                                ...base,
                                borderRadius: "12px",
                                padding: "5px",
                            }),
                        }}
                    />

                    <div className="mt-4 bg-slate-50 p-3 rounded-4 border border-dashed">
                        <h6 className="small fw-bold text-slate-500 mb-3 text-uppercase">
                            {t("all_prod.modal_attr.subtitle")}
                        </h6>

                        {sortedSelectedAttributes.length === 0 ? (
                            <p className="text-muted small mb-0">
                                {t("all_prod.modal_attr.empty")}
                            </p>
                        ) : (
                            <div className="table-responsive bg-white rounded-3 border overflow-hidden">
                                <table className="table table-sm table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr className="small text-secondary text-uppercase">
                                            <th style={{ width: "40%" }}>
                                                {t("all_prod.modal_attr.col_modifier")}
                                            </th>
                                            <th style={{ width: "28%" }}>
                                                {t("all_prod.modal_attr.priority")}
                                            </th>
                                            <th className="text-center" style={{ width: "16%" }}>
                                                {t("all_prod.modal_attr.col_options")}
                                            </th>
                                            <th className="text-end" style={{ width: "16%" }}>
                                                {t("all_prod.modal_attr.col_actions")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedSelectedAttributes.map((attr, sortIdx) => {
                                            const isActive =
                                                Number(activeModifierId) === Number(attr.value);
                                            const optionCount = (getAttrOptions(attr.value) || [])
                                                .length;
                                            return (
                                                <Fragment key={`${attr.value}-${attr.index}`}>
                                                    <tr
                                                        className={isActive ? "table-primary" : ""}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() =>
                                                            setActiveModifierId(
                                                                isActive ? null : attr.value,
                                                            )
                                                        }
                                                    >
                                                        <td className="fw-semibold">
                                                            <span className="me-2">
                                                                {isActive ? "▾" : "▸"}
                                                            </span>
                                                            {attr.label}
                                                        </td>
                                                        <td
                                                            className="py-2"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="d-flex align-items-center gap-1">
                                                                <Button
                                                                    variant="light"
                                                                    size="sm"
                                                                    disabled={sortIdx === 0}
                                                                    className="d-flex align-items-center justify-content-center"
                                                                    style={{
                                                                        borderRadius: "8px",
                                                                        width: "32px",
                                                                        height: "32px",
                                                                        padding: 0,
                                                                        lineHeight: 1,
                                                                    }}
                                                                    onClick={() =>
                                                                        reorderAttributePriority(
                                                                            attr.value,
                                                                            -1,
                                                                        )
                                                                    }
                                                                >
                                                                    −
                                                                </Button>
                                                                <Form.Control
                                                                    type="number"
                                                                    size="sm"
                                                                    min={0}
                                                                    value={attr.index ?? 0}
                                                                    onChange={(e) =>
                                                                        handleAttributeIndexChange(
                                                                            attr.value,
                                                                            parseInt(
                                                                                e.target.value ||
                                                                                    "0",
                                                                                10,
                                                                            ),
                                                                        )
                                                                    }
                                                                    style={{
                                                                        width: "56px",
                                                                        height: "32px",
                                                                        minHeight: "32px",
                                                                        borderRadius: "8px",
                                                                        textAlign: "center",
                                                                        padding: "0 4px",
                                                                        lineHeight: "30px",
                                                                        fontSize: "0.875rem",
                                                                    }}
                                                                />
                                                                <Button
                                                                    variant="light"
                                                                    size="sm"
                                                                    disabled={
                                                                        sortIdx ===
                                                                        sortedSelectedAttributes.length -
                                                                            1
                                                                    }
                                                                    className="d-flex align-items-center justify-content-center"
                                                                    style={{
                                                                        borderRadius: "8px",
                                                                        width: "32px",
                                                                        height: "32px",
                                                                        padding: 0,
                                                                        lineHeight: 1,
                                                                    }}
                                                                    onClick={() =>
                                                                        reorderAttributePriority(
                                                                            attr.value,
                                                                            1,
                                                                        )
                                                                    }
                                                                >
                                                                    +
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        <td className="text-center text-muted small">
                                                            {t("all_prod.modal_attr.options_count", {
                                                                count: optionCount,
                                                            })}
                                                        </td>
                                                        <td
                                                            className="text-end"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="text-danger fw-bold p-0 text-decoration-none"
                                                                onClick={() =>
                                                                    syncAttributes(
                                                                        selectedAttributes.filter(
                                                                            (a) =>
                                                                                a.value !==
                                                                                attr.value,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                {t("common.remove")}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                    {isActive ? (
                                                        <tr>
                                                            <td
                                                                colSpan={4}
                                                                className="p-0 border-0"
                                                            >
                                                                <div className="bg-white border-start border-4 border-primary p-3">
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <div>
                                                                            <div className="text-muted small text-uppercase">
                                                                                {t(
                                                                                    "all_prod.modal_attr.child_heading",
                                                                                )}
                                                                            </div>
                                                                            <div className="fw-bold">
                                                                                {attr.label}
                                                                            </div>
                                                                        </div>
                                                                        <Button
                                                                            variant="outline-secondary"
                                                                            size="sm"
                                                                            className="rounded-pill"
                                                                            onClick={() =>
                                                                                setActiveModifierId(
                                                                                    null,
                                                                                )
                                                                            }
                                                                        >
                                                                            {t("common.hide")}
                                                                        </Button>
                                                                    </div>
                                                                    <div className="small text-muted mb-3">
                                                                        {t(
                                                                            "all_prod.modal_attr.option_nested",
                                                                        )}
                                                                    </div>
                                                                    {(getAttrOptions(attr.value) ||
                                                                        []).length === 0 ? (
                                                                        <p className="text-muted small mb-0">
                                                                            {t(
                                                                                "all_prod.modal_attr.no_options",
                                                                            )}
                                                                        </p>
                                                                    ) : (
                                                                        (getAttrOptions(
                                                                            attr.value,
                                                                        ) || []).map((opt) => {
                                                                            const nestedChoices = (
                                                                                attributes || []
                                                                            )
                                                                                .filter(
                                                                                    (candidate) =>
                                                                                        Number(
                                                                                            candidate.id,
                                                                                        ) !==
                                                                                        Number(
                                                                                            attr.value,
                                                                                        ),
                                                                                )
                                                                                .map(
                                                                                    (candidate) => ({
                                                                                        value: candidate.id,
                                                                                        label: candidate.name,
                                                                                    }),
                                                                                );
                                                                            const selectedNested = (
                                                                                optionNestedMap[
                                                                                    opt.id
                                                                                ] || []
                                                                            )
                                                                                .map((id) => {
                                                                                    const found =
                                                                                        nestedChoices.find(
                                                                                            (
                                                                                                candidate,
                                                                                            ) =>
                                                                                                Number(
                                                                                                    candidate.value,
                                                                                                ) ===
                                                                                                Number(
                                                                                                    id,
                                                                                                ),
                                                                                        );
                                                                                    return (
                                                                                        found ||
                                                                                        null
                                                                                    );
                                                                                })
                                                                                .filter(Boolean);
                                                                            return (
                                                                                <div
                                                                                    key={opt.id}
                                                                                    className="mb-3 pb-3 border-bottom"
                                                                                >
                                                                                    <div className="small fw-bold mb-1">
                                                                                        {opt.name}
                                                                                    </div>
                                                                                    <Select
                                                                                        isMulti
                                                                                        options={
                                                                                            nestedChoices
                                                                                        }
                                                                                        value={
                                                                                            selectedNested
                                                                                        }
                                                                                        placeholder={t(
                                                                                            "all_prod.modal_attr.ph_nested",
                                                                                        )}
                                                                                        onChange={(
                                                                                            vals,
                                                                                        ) =>
                                                                                            handleOptionNestedChange(
                                                                                                opt.id,
                                                                                                (
                                                                                                    vals ||
                                                                                                    []
                                                                                                ).map(
                                                                                                    (
                                                                                                        v,
                                                                                                    ) =>
                                                                                                        v.value,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : null}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {sortedSelectedAttributes.length > 0 && !activeModifierId ? (
                            <p className="text-muted small mt-3 mb-0">
                                {t("all_prod.modal_attr.parent_hint")}
                            </p>
                        ) : null}
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={showSpecialAttributeModal} centered size="lg" onHide={() => setShowSpecialAttributeModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">{t("all_prod.modal_spec.title")}{selectEditItem?.name}</Modal.Title></Modal.Header>
                <Modal.Body className="p-4">
                    <Select isMulti components={animatedComponents} options={specialAttributes?.map(a => ({ value: a.id, label: a.name }))} value={selectedSpecialAttributes} onChange={syncSpecialAttributes} />
                    <div className="mt-4 p-4 bg-slate-50 rounded-4 border border-dashed">
                        <h6 className="small fw-bold text-slate-500 mb-3">{t("all_prod.modal_spec.subtitle")}</h6>
                        <div className="d-flex flex-wrap gap-2">
                            {selectedSpecialAttributes?.map(attr => (
                                <Badge key={attr.value} bg="white" text="primary" className="d-flex align-items-center gap-2 p-3 rounded-4 shadow-sm border border-primary border-opacity-10 fw-bold">
                                    {attr.label}
                                    <FaTrash className="cursor-pointer text-danger" onClick={() => syncSpecialAttributes(selectedSpecialAttributes.filter(a => a.value !== attr.value))} />
                                </Badge>
                            ))}
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={showDeletedModal} centered size="lg" onHide={() => setShowDeletedModal(false)} className="rounded-4">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <FaArchive className="text-secondary" /> {t("all_prod.modal_del.title")}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-4">{t("all_prod.modal_del.desc")}</p>
                    {deletedItems.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <FaArchive size={48} className="mb-3 opacity-50" />
                            <p className="mb-0">{t("all_prod.modal_del.empty")}</p>
                        </div>
                    ) : (
                        <Table hover className="mb-0">
                            <thead className="bg-slate-50">
                                <tr className="text-secondary small fw-bold text-uppercase">
                                    <th>{t("all_prod.modal_del.th_prod")}</th>
                                    <th>{t("all_prod.modal_del.th_cat")}</th>
                                    <th className="text-end">{t("all_prod.modal_del.th_actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deletedItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-3">
                                                <img src={item?.image_url || PLACEHOLDER_IMAGE} className="rounded border" style={{ width: "40px", height: "40px", objectFit: "cover" }} alt="" />
                                                <div>
                                                    <div className="fw-bold text-slate-800">{item?.name}</div>
                                                    {item?.chinese_name && <div className="text-muted small">{item.chinese_name}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="align-middle">{item?.Category?.name || "—"}</td>
                                        <td className="text-end align-middle">
                                            <Button variant="outline-primary" size="sm" className="rounded-pill fw-bold" onClick={() => handleRestoreDeletedItem(item)}>
                                                <FaUndo className="me-1" /> {t("common.restore")}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
            </Modal>

            <Modal show={showRestoreCategoryModal} centered onHide={() => { setShowRestoreCategoryModal(false); setRestorePickItem(null); }} className="rounded-4">
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">{t("all_prod.modal_res.title")}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <p className="text-muted small mb-3">
                        {restorePickItem ? `"${restorePickItem.name}"` : "This product"}{t("all_prod.modal_res.desc")}
                    </p>
                    <Form.Group>
                        <Form.Label className="small fw-bold text-secondary">{t("all_prod.modal_res.label_cat")}</Form.Label>
                        <Form.Select
                            value={restorePickCategoryId}
                            onChange={(e) => setRestorePickCategoryId(e.target.value)}
                        >
                            <option value="">{t("all_prod.modal_res.ph_cat")}</option>
                            {[...categoryRows]
                                .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
                                .map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                        </Form.Select>
                    </Form.Group>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <Button variant="light" className="fw-bold" onClick={() => { setShowRestoreCategoryModal(false); setRestorePickItem(null); }}>{t("common.cancel")}</Button>
                        <Button variant="primary" className="fw-bold" onClick={confirmRestoreWithCategory}>{t("common.restore")}</Button>
                    </div>
                </Modal.Body>
            </Modal>
            </div>
        </div>
    );
}

export default AllProduct;
