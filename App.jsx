import { useState, useCallback, useRef } from "react";

const NAVY = "#1B2A4A";
const RED = "#BE1E2D";
const GOLD = "#C5A253";
const DARK_GRAY = "#3A4256";
const MID_GRAY = "#8B92A0";
const LIGHT_GRAY = "#E8EAF0";
const OFF_WHITE = "#F5F6F9";

const CONSULTANTS = ["Christopher Peck", "Lawrence Stone", "Kenny Wadsworth", "Dustin Fontes", "Matt Conn", "Sarah Thurman", "Josh Thoulion"];

const FORMS = [
  { id: "credit", label: "Credit Application", when: "All Deals", required: true },
  { id: "privacy", label: "Privacy Notice / GLBA", when: "Credit Deals", required: true },
  { id: "buyers", label: "Buyer's Order (No Add-Ons)", when: "All Deals", required: true },
  { id: "recall", label: "No Open Recall Acknowledgment", when: "All Deals", required: true },
  { id: "warranty", label: "New Vehicle Warranty Disclosure", when: "New Only", required: false },
  { id: "concierge", label: "Concierge Package Disclosure", when: "All Deals", required: true },
  { id: "weowe", label: "We-Owe / Due Bill", when: "All Deals", required: true },
  { id: "adverse", label: "Adverse Action Notice", when: "If Applicable", required: false },
];

const WARRANTY_ROWS = [
  "Basic / Bumper-to-Bumper",
  "Powertrain",
  "Corrosion / Perforation",
  "Roadside Assistance",
  "Federal Emissions",
];

const CONCIERGE_BENEFITS = [
  { title: "VIN Etching", desc: "Permanently applied to windows as theft deterrent. Registered in national database." },
  { title: "Oil Change Package (2 Services)", desc: "Two oil changes at Sayer CJDR service dept. Redeem within 24 months. Includes oil, filter, multi-point inspection." },
  { title: "10% Off All Parts & Service", desc: "Duration of ownership. Customer-pay repairs, maintenance, parts. Cannot combine with other offers." },
  { title: "$500 Off Next Vehicle Purchase", desc: "Loyalty credit toward next new or used vehicle at Sayer CJDR. Non-transferable. No cash value." },
  { title: "Priority Service Scheduling", desc: "Next-available time slots and expedited check-in at the service drive." },
  { title: "Annual Multi-Point Inspection", desc: "Brake, tire, fluid, battery, belt inspection with written report. Once per year during ownership." },
];

export default function DealJacketApp() {
  const [step, setStep] = useState("entry"); // entry | forms | print
  const [dealInfo, setDealInfo] = useState({
    customerFirst: "", customerLast: "", cobuyer: "",
    vin: "", year: "", make: "", model: "", trim: "", color: "",
    mileage: "", stock: "", deal: "", type: "Used",
    consultant: "", date: new Date().toISOString().slice(0, 10),
  });
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [vinDecoded, setVinDecoded] = useState(false);
  const [checklist, setChecklist] = useState({});
  const [activeForm, setActiveForm] = useState(null);
  const [recallStatus, setRecallStatus] = useState("none");
  const [recallDetails, setRecallDetails] = useState("");
  const [weOweStatus, setWeOweStatus] = useState("nothing");
  const [weOweItems, setWeOweItems] = useState(["", "", "", ""]);
  const [warrantyData, setWarrantyData] = useState(WARRANTY_ROWS.map(() => ({ duration: "", mileage: "" })));
  const printRef = useRef();

  const updateDeal = (field, value) => setDealInfo(prev => ({ ...prev, [field]: value }));

  const decodeVin = useCallback(async () => {
    const vin = dealInfo.vin.trim().toUpperCase();
    if (vin.length !== 17) { setVinError("VIN must be 17 characters"); return; }
    setVinLoading(true); setVinError(""); setVinDecoded(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      const r = data.Results?.[0];
      if (r && r.Make && r.Make !== "") {
        updateDeal("year", r.ModelYear || "");
        updateDeal("make", r.Make || "");
        updateDeal("model", r.Model || "");
        updateDeal("trim", r.Trim || "");
        updateDeal("type", parseInt(r.ModelYear) >= new Date().getFullYear() ? "New" : "Used");
        setVinDecoded(true);
      } else { setVinError("Could not decode — fill vehicle details manually below"); }
    } catch {
      setVinError("VIN lookup unavailable in this environment — fill vehicle details manually below");
    }
    setVinLoading(false);
  }, [dealInfo.vin]);

  const customerFull = `${dealInfo.customerFirst} ${dealInfo.customerLast}`.trim();
  const vehicleFull = `${dealInfo.year} ${dealInfo.make} ${dealInfo.model}${dealInfo.trim ? " " + dealInfo.trim : ""}`.trim();
  const isNew = dealInfo.type === "New";

  // ─── ENTRY SCREEN ───
  if (step === "entry") {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${NAVY} 0%, ${DARK_GRAY} 100%)`, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: GOLD, fontWeight: 700, marginBottom: 6 }}>SAYER CHRYSLER DODGE JEEP RAM</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: -0.5 }}>Deal Jacket Builder</h1>
            <p style={{ fontSize: 13, color: MID_GRAY, margin: 0 }}>Enter deal info once — auto-fill all compliance forms</p>
          </div>

          {/* VIN Section */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 2, display: "block", marginBottom: 10 }}>VEHICLE IDENTIFICATION NUMBER</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={dealInfo.vin} onChange={e => { updateDeal("vin", e.target.value.toUpperCase()); setVinDecoded(false); setVinError(""); }}
                placeholder="Enter 17-character VIN"
                maxLength={17}
                style={{ flex: 1, padding: "12px 14px", borderRadius: 8, border: `2px solid ${vinDecoded ? "#2D8C4E" : vinError ? RED : "rgba(255,255,255,0.15)"}`, background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 16, fontFamily: "'Courier New', monospace", letterSpacing: 2, outline: "none", transition: "border-color 0.2s" }}
              />
              <button
                onClick={decodeVin} disabled={vinLoading}
                style={{ padding: "12px 24px", borderRadius: 8, background: vinDecoded ? "#2D8C4E" : GOLD, color: vinDecoded ? "#fff" : NAVY, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", minWidth: 110, transition: "all 0.2s" }}
              >
                {vinLoading ? "Decoding..." : vinDecoded ? "✓ Decoded" : "Decode VIN"}
              </button>
              <button
                onClick={() => setVinDecoded(false)}
                style={{ padding: "12px 14px", borderRadius: 8, background: "transparent", color: MID_GRAY, fontWeight: 600, fontSize: 11, border: `1px solid rgba(255,255,255,0.15)`, cursor: "pointer", transition: "all 0.2s" }}
              >
                Skip
              </button>
            </div>
            {vinError && <div style={{ color: RED, fontSize: 12, marginTop: 6 }}>{vinError}</div>}
            {vinDecoded && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(45,140,78,0.15)", borderRadius: 8, border: "1px solid rgba(45,140,78,0.3)", display: "flex", gap: 20, flexWrap: "wrap" }}>
                <span style={{ color: "#7DCEA0", fontSize: 13 }}><strong style={{ color: "#fff" }}>{dealInfo.year}</strong> {dealInfo.make} {dealInfo.model} {dealInfo.trim}</span>
                <span style={{ color: GOLD, fontSize: 12, fontWeight: 600 }}>{dealInfo.type === "New" ? "NEW" : "USED"}</span>
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 2, display: "block", marginBottom: 12 }}>VEHICLE DETAILS</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {[
                ["year", "Year"], ["make", "Make"], ["model", "Model"], ["trim", "Trim"],
              ].map(([k, l]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>{l}</div>
                  <input value={dealInfo[k]} onChange={e => updateDeal(k, e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Color</div>
                <input value={dealInfo.color} onChange={e => updateDeal("color", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Mileage</div>
                <input value={dealInfo.mileage} onChange={e => updateDeal("mileage", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Stock #</div>
                <input value={dealInfo.stock} onChange={e => updateDeal("stock", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Deal #</div>
                <input value={dealInfo.deal} onChange={e => updateDeal("deal", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>New / Used</div>
                <select value={dealInfo.type} onChange={e => updateDeal("type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 2, display: "block", marginBottom: 12 }}>CUSTOMER INFORMATION</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>First Name</div>
                <input value={dealInfo.customerFirst} onChange={e => updateDeal("customerFirst", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Last Name</div>
                <input value={dealInfo.customerLast} onChange={e => updateDeal("customerLast", e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Co-Buyer (if applicable)</div>
                <input value={dealInfo.cobuyer} onChange={e => updateDeal("cobuyer", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Sales Consultant</div>
                <input value={dealInfo.consultant} onChange={e => updateDeal("consultant", e.target.value)} placeholder="Enter name" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 4 }}>Date</div>
                <input type="date" value={dealInfo.date} onChange={e => updateDeal("date", e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => setStep("forms")}
            disabled={!customerFull.trim() || !dealInfo.vin}
            style={{
              width: "100%", padding: "16px", borderRadius: 10, border: "none",
              background: (!customerFull.trim() || !dealInfo.vin) ? MID_GRAY : `linear-gradient(135deg, ${GOLD}, #D4A843)`,
              color: NAVY, fontSize: 15, fontWeight: 800, cursor: (!customerFull.trim() || !dealInfo.vin) ? "not-allowed" : "pointer",
              letterSpacing: 1, transition: "all 0.2s", boxShadow: "0 4px 20px rgba(197,162,83,0.3)"
            }}
          >
            GENERATE DEAL JACKET →
          </button>
        </div>
      </div>
    );
  }

  // ─── FORMS / PRINT VIEW ───
  const formsToPrint = FORMS.filter(f => {
    if (f.id === "warranty" && !isNew) return false;
    return true;
  });

  const renderFormContent = (formId) => {
    const d = dealInfo;
    const today = new Date(d.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const headerBlock = (title) => (
      <div style={{ background: NAVY, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{title}</div>
          <div style={{ color: GOLD, fontSize: 10, letterSpacing: 1 }}>Sayer Chrysler Dodge Jeep Ram • Idaho Falls, Idaho</div>
        </div>
        <div style={{ color: GOLD, fontSize: 10, fontWeight: 600 }}>Sales Compliance Document</div>
      </div>
    );

    const infoGrid = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", padding: "14px 24px", background: OFF_WHITE, fontSize: 12 }}>
        <div><strong>Customer:</strong> {customerFull}{d.cobuyer ? ` / ${d.cobuyer}` : ""}</div>
        <div><strong>Date:</strong> {today}</div>
        <div><strong>Vehicle:</strong> {vehicleFull}</div>
        <div><strong>VIN:</strong> <span style={{ fontFamily: "monospace" }}>{d.vin}</span></div>
        <div><strong>Mileage:</strong> {d.mileage || "—"}</div>
        <div><strong>Stock #:</strong> {d.stock || "—"}{d.deal ? ` • Deal #: ${d.deal}` : ""}{d.color ? ` • Color: ${d.color}` : ""}</div>
      </div>
    );

    const sigBlock = (...labels) => (
      <div style={{ padding: "16px 24px", borderTop: `2px solid ${LIGHT_GRAY}` }}>
        {labels.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 30, marginBottom: i < labels.length - 1 ? 18 : 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: `1px solid ${MID_GRAY}`, height: 28 }} />
              <div style={{ fontSize: 9, color: MID_GRAY, marginTop: 3 }}>{l}</div>
            </div>
            <div style={{ width: 160 }}>
              <div style={{ borderBottom: `1px solid ${MID_GRAY}`, height: 28 }} />
              <div style={{ fontSize: 9, color: MID_GRAY, marginTop: 3 }}>Date</div>
            </div>
          </div>
        ))}
      </div>
    );

    switch (formId) {
      case "recall":
        return (
          <div>
            {headerBlock("NO OPEN RECALL ACKNOWLEDGMENT")}
            {infoGrid}
            <div style={{ padding: "16px 24px", fontSize: 12, color: DARK_GRAY, lineHeight: 1.6 }}>
              By signing below, the customer acknowledges that, to the best of the dealership's knowledge, there are no open safety recalls on the vehicle described above at the time of delivery. The customer has been informed of how to check for future recalls at <strong>www.nhtsa.gov/recalls</strong> or by calling <strong>1-888-327-4236</strong>.
            </div>
            <div style={{ padding: "0 24px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 10 }}>RECALL STATUS</div>
              {[
                ["none", "No open recalls found at time of delivery"],
                ["completed", "All open recalls have been completed prior to delivery"],
                ["pending", "Open recall(s) exist — customer has been notified"],
              ].map(([val, label]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: DARK_GRAY, cursor: "pointer" }}>
                  <input type="radio" name="recallStatus" value={val} checked={recallStatus === val} onChange={e => setRecallStatus(e.target.value)} />
                  {label}
                </label>
              ))}
              {recallStatus === "pending" && (
                <textarea value={recallDetails} onChange={e => setRecallDetails(e.target.value)} placeholder="Describe open recall(s)..." rows={3} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 6, border: `1px solid ${LIGHT_GRAY}`, fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
              )}
            </div>
            {sigBlock("Customer Signature", "Sales Consultant")}
          </div>
        );

      case "warranty":
        return (
          <div>
            {headerBlock("NEW VEHICLE WARRANTY DISCLOSURE")}
            {infoGrid}
            <div style={{ padding: "16px 24px", fontSize: 12, color: DARK_GRAY, lineHeight: 1.6 }}>
              The following is a summary of the manufacturer's warranty coverage. Please review your Owner's Manual and Warranty Guide for complete terms and conditions.
            </div>
            <div style={{ padding: "0 24px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: NAVY, color: "#fff" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Coverage Type</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", width: 140 }}>Duration</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", width: 140 }}>Mileage Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {WARRANTY_ROWS.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#FAFBFC" : "#fff" }}>
                      <td style={{ padding: "6px 12px", borderBottom: `1px solid ${LIGHT_GRAY}` }}>{row}</td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${LIGHT_GRAY}` }}>
                        <input value={warrantyData[i].duration} onChange={e => { const n = [...warrantyData]; n[i].duration = e.target.value; setWarrantyData(n); }} style={{ width: "100%", border: `1px solid ${LIGHT_GRAY}`, borderRadius: 4, padding: "4px 6px", fontSize: 11, boxSizing: "border-box" }} />
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${LIGHT_GRAY}` }}>
                        <input value={warrantyData[i].mileage} onChange={e => { const n = [...warrantyData]; n[i].mileage = e.target.value; setWarrantyData(n); }} style={{ width: "100%", border: `1px solid ${LIGHT_GRAY}`, borderRadius: 4, padding: "4px 6px", fontSize: 11, boxSizing: "border-box" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sigBlock("Customer Signature", "Sales Consultant")}
          </div>
        );

      case "concierge":
        return (
          <div>
            {headerBlock("CONCIERGE PACKAGE DISCLOSURE")}
            {infoGrid}
            <div style={{ padding: "16px 24px", fontSize: 12, color: DARK_GRAY, lineHeight: 1.6 }}>
              The following products, services, and benefits have been presented as <strong>optional additions</strong> to this vehicle purchase. The customer acknowledges they have <strong>voluntarily chosen</strong> to add the Sayer CJDR Concierge Package. This package is <strong>not required</strong> to complete the purchase.
            </div>
            <div style={{ padding: "0 24px 12px" }}>
              {CONCIERGE_BENEFITS.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "8px 12px", background: i % 2 === 0 ? "#FAFBFC" : "#fff", borderLeft: `3px solid ${i % 2 === 0 ? NAVY : GOLD}`, borderRadius: "0 6px 6px 0" }}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 13, minWidth: 18 }}>{i + 1}.</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: NAVY }}>{b.title}</div>
                    <div style={{ fontSize: 10, color: MID_GRAY, lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "8px 24px", fontSize: 10, fontStyle: "italic", color: MID_GRAY, background: OFF_WHITE, borderLeft: `3px solid ${RED}`, margin: "0 24px 12px", borderRadius: "0 6px 6px 0" }}>
              I acknowledge this is an optional addition. I was not required to purchase this package. I have reviewed pricing, signed product contracts, and understand all terms. No warranty, GAP, or aftermarket products have been added — those will be presented by Finance.
            </div>
            {sigBlock("Customer Signature", "Sales Consultant")}
          </div>
        );

      case "weowe":
        return (
          <div>
            {headerBlock("WE-OWE / DUE BILL")}
            {infoGrid}
            <div style={{ padding: "16px 24px", fontSize: 12, color: DARK_GRAY, lineHeight: 1.6 }}>
              This document records any items, services, or repairs owed to the customer. If nothing is owed, the "Nothing Owed" option must be selected. Verbal promises not documented here are <strong>not binding</strong>.
            </div>
            <div style={{ padding: "0 24px 16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: weOweStatus === "nothing" ? "rgba(45,140,78,0.08)" : "#fff", border: `1px solid ${weOweStatus === "nothing" ? "#2D8C4E" : LIGHT_GRAY}`, borderRadius: 8, marginBottom: 8, cursor: "pointer", fontSize: 12 }}>
                <input type="radio" name="weowe" value="nothing" checked={weOweStatus === "nothing"} onChange={e => setWeOweStatus(e.target.value)} />
                <strong>NOTHING OWED</strong> — All items complete, nothing additional owed
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: weOweStatus === "items" ? "rgba(197,162,83,0.08)" : "#fff", border: `1px solid ${weOweStatus === "items" ? GOLD : LIGHT_GRAY}`, borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                <input type="radio" name="weowe" value="items" checked={weOweStatus === "items"} onChange={e => setWeOweStatus(e.target.value)} style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <strong>ITEMS OWED</strong> — The following items are owed:
                  {weOweStatus === "items" && (
                    <div style={{ marginTop: 8 }}>
                      {weOweItems.map((item, i) => (
                        <input key={i} value={item} onChange={e => { const n = [...weOweItems]; n[i] = e.target.value; setWeOweItems(n); }}
                          placeholder={`Item ${i + 1}`}
                          style={{ width: "100%", marginBottom: 6, padding: "6px 10px", borderRadius: 6, border: `1px solid ${LIGHT_GRAY}`, fontSize: 11, boxSizing: "border-box" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
            {sigBlock("Customer Signature", "Sales Consultant", "Manager Approval")}
          </div>
        );

      default:
        return (
          <div>
            {headerBlock(FORMS.find(f => f.id === formId)?.label?.toUpperCase() || "")}
            {infoGrid}
            <div style={{ padding: "40px 24px", textAlign: "center", color: MID_GRAY, fontSize: 13 }}>
              Use your existing {FORMS.find(f => f.id === formId)?.label} form — customer and vehicle information has been pre-filled above for reference.
            </div>
            {sigBlock("Customer Signature", "Sales Consultant")}
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: OFF_WHITE, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ background: NAVY, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ color: GOLD, fontSize: 9, letterSpacing: 2, fontWeight: 700 }}>SAYER CJDR</div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>Deal Jacket</div>
          </div>
          <div style={{ height: 30, width: 1, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ color: "#fff", fontSize: 12 }}>
            <strong>{customerFull}</strong> • {vehicleFull} • {dealInfo.stock && `Stock #${dealInfo.stock}`}{dealInfo.deal && ` • Deal #${dealInfo.deal}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStep("entry")} style={topBtnStyle}>← Edit Deal</button>
          <button onClick={() => window.print()} style={{ ...topBtnStyle, background: GOLD, color: NAVY }}>🖨 Print All</button>
        </div>
      </div>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", gap: 0 }}>
        {/* Sidebar Checklist */}
        <div style={{ width: 260, minHeight: "calc(100vh - 54px)", background: "#fff", borderRight: `1px solid ${LIGHT_GRAY}`, padding: "20px 0", flexShrink: 0 }}>
          <div style={{ padding: "0 20px 12px", fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: 2 }}>DOCUMENT CHECKLIST</div>
          {formsToPrint.map(f => (
            <div
              key={f.id}
              onClick={() => setActiveForm(f.id)}
              style={{
                padding: "10px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                background: activeForm === f.id ? OFF_WHITE : "transparent",
                borderLeft: activeForm === f.id ? `3px solid ${GOLD}` : "3px solid transparent",
                transition: "all 0.15s"
              }}
            >
              <input type="checkbox" checked={!!checklist[f.id]} onChange={e => { e.stopPropagation(); setChecklist(prev => ({ ...prev, [f.id]: !prev[f.id] })); }} style={{ accentColor: "#2D8C4E", width: 16, height: 16, cursor: "pointer" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: activeForm === f.id ? 700 : 500, color: checklist[f.id] ? "#2D8C4E" : NAVY, textDecoration: checklist[f.id] ? "line-through" : "none" }}>{f.label}</div>
                <div style={{ fontSize: 9, color: f.when === "New Only" ? RED : f.when === "If Applicable" ? "#D4920B" : MID_GRAY }}>{f.when}</div>
              </div>
            </div>
          ))}
          {/* Progress */}
          <div style={{ padding: "16px 20px", marginTop: 12, borderTop: `1px solid ${LIGHT_GRAY}` }}>
            <div style={{ fontSize: 10, color: MID_GRAY, marginBottom: 6 }}>
              {Object.values(checklist).filter(Boolean).length} / {formsToPrint.length} complete
            </div>
            <div style={{ height: 6, background: LIGHT_GRAY, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(Object.values(checklist).filter(Boolean).length / formsToPrint.length) * 100}%`, background: Object.values(checklist).filter(Boolean).length === formsToPrint.length ? "#2D8C4E" : GOLD, borderRadius: 3, transition: "width 0.3s" }} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 24 }} ref={printRef}>
          {activeForm ? (
            <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${LIGHT_GRAY}` }}>
              {renderFormContent(activeForm)}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Select a document</div>
              <div style={{ fontSize: 13, color: MID_GRAY }}>Click any form in the sidebar to preview, fill, and print</div>
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          div[style*="position: sticky"] { display: none !important; }
          div[style*="width: 260"] { display: none !important; }
          div[style*="flex: 1"] { padding: 0 !important; }
          div[style*="border-radius: 10"] { box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.25)",
  color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const topBtnStyle = {
  padding: "7px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent", color: "#fff", fontSize: 12, fontWeight: 600,
  cursor: "pointer", transition: "all 0.15s",
};
