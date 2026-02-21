import { useEffect, useMemo, useState } from "react";
import "./index.css";

const pad = (n) => String(n).padStart(2, "0");
const STORAGE_KEY = "clinic_simple_v2";
const THEME_KEY = "clinic_theme_v1";

function makeSlots() {
    const out = [];
    for (let h = 9; h <= 17; h++) {
        out.push(`${pad(h)}:00`);
        if (h !== 17) out.push(`${pad(h)}:30`);
    }
    return out;
}

function nextFreeSlot(doctorId, date, time, slots, appts, ignoreApptId = null) {
    const start = Math.max(0, slots.indexOf(time));
    for (let i = start; i < slots.length; i++) {
        const t = slots[i];
        const busy = appts.some(
            (a) =>
                a.id !== ignoreApptId &&
                a.doctorId === doctorId &&
                a.date === date &&
                a.time === t &&
                a.status !== "cancelled"
        );
        if (!busy) return t;
    }
    return null;
}


function parsePhoneOk(phone) {
    const cleaned = phone.replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/[^\d]/g, "");
    return digits.length >= 9;
}

function compareAppts(a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
}

export default function App() {
    const slots = useMemo(() => makeSlots(), []);
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const [toast, setToast] = useState(null);
    const [busyAction, setBusyAction] = useState(false);

    const showToast = (text) => setToast({ id: crypto.randomUUID(), text });

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2200);
        return () => clearTimeout(t);
    }, [toast]);

    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem(THEME_KEY);
        return saved === "dark" ? "dark" : "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const load = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed?.doctors || !parsed?.appts) return null;
            return parsed;
        } catch {
            return null;
        }
    };

    const saved = load();

    const defaultDoctors = [
        {
            id: crypto.randomUUID(),
            name: "Dr. Anna Petrova",
            phone: "+44 7700 900123",
            spec: "Dentist",
        },
    ];

    const [doctors, setDoctors] = useState(
        saved?.doctors?.length ? saved.doctors : defaultDoctors
    );

    const defaultAppts = [
        {
            id: crypto.randomUUID(),
            doctorId: (saved?.doctors?.[0]?.id || defaultDoctors[0].id),
            patient: "Demo",
            date: today,
            time: "10:00",
            status: "scheduled",
        },
    ];

    const [appts, setAppts] = useState(
        saved?.appts?.length ? saved.appts : defaultAppts
    );

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ doctors, appts }));
    }, [doctors, appts]);

    const [doctorForm, setDoctorForm] = useState({ name: "", phone: "", spec: "" });
    const [editingId, setEditingId] = useState(null);
    const [doctorErr, setDoctorErr] = useState("");

    const [apptForm, setApptForm] = useState({
        doctorId: doctors[0]?.id || "",
        patient: "",
        date: today,
        time: "09:00",
    });

    useEffect(() => {
        if (!apptForm.doctorId && doctors[0]?.id) {
            setApptForm((f) => ({ ...f, doctorId: doctors[0].id }));
        }
    }, [doctors]);


    const [moveModal, setMoveModal] = useState(null);
    const [moveForm, setMoveForm] = useState({ doctorId: "", date: today, time: "09:00" });
    const [moveMsg, setMoveMsg] = useState("");

    const fakeLoading = async (ms = 650) => {
        setBusyAction(true);
        await new Promise((r) => setTimeout(r, ms));
        setBusyAction(false);
    };

    const busySetFor = (doctorId, date, ignoreId = null) => {
        const set = new Set();
        appts.forEach((a) => {
            if (
                a.id !== ignoreId &&
                a.doctorId === doctorId &&
                a.date === date &&
                a.status !== "cancelled"
            ) {
                set.add(a.time);
            }
        });
        return set;
    };

    const addOrSaveDoctor = async () => {
        if (busyAction) return;
        setDoctorErr("");

        const data = {
            name: doctorForm.name.trim(),
            phone: doctorForm.phone.trim(),
            spec: doctorForm.spec.trim(),
        };

        if (!data.name || !data.phone || !data.spec) {
            setDoctorErr("Fill all fields.");
            return;
        }

        if (!parsePhoneOk(data.phone)) {
            setDoctorErr("Phone looks too short.");
            return;
        }

        await fakeLoading(520);

        if (editingId) {
            setDoctors((p) => p.map((d) => (d.id === editingId ? { ...d, ...data } : d)));
            setEditingId(null);
            setDoctorForm({ name: "", phone: "", spec: "" });
            showToast("Saved ✅");
            return;
        }



        const id = crypto.randomUUID();
        setDoctors((p) => [{ id, ...data }, ...p]);
        setDoctorForm({ name: "", phone: "", spec: "" });
        if (!apptForm.doctorId) setApptForm((f) => ({ ...f, doctorId: id }));
        showToast("Doctor added ✅");


    };

    const editDoctor = (doc) => {
        setDoctorErr("");
        setEditingId(doc.id);
        setDoctorForm({ name: doc.name, phone: doc.phone, spec: doc.spec });
    };

    const deleteDoctor = async (id) => {
        if (busyAction) return;
        const doc = doctors.find((d) => d.id === id);
        const ok = window.confirm(
            `Delete doctor "${doc?.name || ""}"? All their appointments will be removed.`
        );
        if (!ok) return;


        await fakeLoading(520);

        setDoctors((p) => p.filter((d) => d.id !== id));
        setAppts((p) => p.filter((a) => a.doctorId !== id));
        setApptForm((f) => (f.doctorId === id ? { ...f, doctorId: "" } : f));
        showToast("Deleted 🗑️");
    };

    const addAppointment = async () => {
        if (busyAction) return;

        const doctorId = apptForm.doctorId;
        const patient = apptForm.patient.trim();
        const date = apptForm.date;
        const time = apptForm.time;

        if (!doctorId || !patient || !date || !time) return;

        if (date < today) {
            showToast("Date can’t be in the past");
            return;
        }

        await fakeLoading(650);

        const freeTime = nextFreeSlot(doctorId, date, time, slots, appts);
        if (!freeTime) {
            showToast("No free slots that day");
            return;
        }

        setAppts((p) => [
            {
                id: crypto.randomUUID(),
                doctorId,
                patient,
                date,
                time: freeTime,
                status: "scheduled",
            },
            ...p,
        ]);

        setApptForm((f) => ({ ...f, patient: "" }));

        if (freeTime !== time) showToast(`Busy → moved to ${freeTime}`);
        else showToast("Appointment added ✅");
    };

    const deleteAppt = async (id) => {
        if (busyAction) return;
        const a = appts.find((x) => x.id === id);
        const ok = window.confirm(`Delete appointment for "${a?.patient || ""}"?`);
        if (!ok) return;

        await fakeLoading(520);

        setAppts((p) => p.filter((x) => x.id !== id));
        showToast("Deleted 🗑️");
    };

    const toggleDone = async (id) => {
        if (busyAction) return;
        await fakeLoading(420);
        setAppts((p) =>
            p.map((a) => {
                if (a.id !== id) return a;
                if (a.status === "cancelled") return a;
                return { ...a, status: a.status === "done" ? "scheduled" : "done" };
            })
        );
        showToast("Updated ✅");
    };

    const cancelAppt = async (id) => {
        if (busyAction) return;
        await fakeLoading(420);
        setAppts((p) => p.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
        showToast("Cancelled ❌");
    };

    const openMove = (appt) => {
        setMoveMsg("");
        setMoveModal(appt);
        setMoveForm({ doctorId: appt.doctorId, date: appt.date, time: appt.time });
    };

    const confirmMove = async () => {
        if (busyAction || !moveModal) return;

        const doctorId = moveForm.doctorId;
        const date = moveForm.date;
        const time = moveForm.time;

        if (!doctorId || !date || !time) return;

        if (date < today) {
            setMoveMsg("Date can’t be in the past.");
            return;
        }

        await fakeLoading(650);

        const freeTime = nextFreeSlot(doctorId, date, time, slots, appts, moveModal.id);
        if (!freeTime) {
            setMoveMsg("No free slots for this day.");
            return;
        }

        setAppts((p) =>
            p.map((a) =>
                a.id === moveModal.id
                    ? { ...a, doctorId, date, time: freeTime, status: "scheduled" }
                    : a
            )
        );

        if (freeTime !== time) setMoveMsg(`Selected time was busy → moved to ${freeTime}.`);
        else setMoveMsg("Moved ✅");

        setTimeout(() => {
            setMoveModal(null);
            setMoveMsg("");
            showToast("Moved ✅");
        }, 450);
    };

    const sortedAppts = useMemo(() => [...appts].sort(compareAppts), [appts]);

    const busyAdd = useMemo(() => {
        if (!apptForm.doctorId || !apptForm.date) return new Set();
        return busySetFor(apptForm.doctorId, apptForm.date, null);
    }, [apptForm.doctorId, apptForm.date, appts]);



    return (
        <div className="wrap">
            <div className="bgBlur" />

            <div className="header">
                <div>
                    <h1>Clinic</h1>

                    <div className="sub">
                        Doctors: <b>{doctors.length}</b> • Appointments: <b>{appts.length}</b>
                    </div>


                </div>


                <div className="headerActions">
                    <button
                        className="ghost"
                        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                    >
                        {theme === "dark" ? "☀ Light" : "🌙 Dark"}
                    </button>

                    <button
                        className="ghost"
                        disabled={busyAction}
                        onClick={() => {
                            const ok = window.confirm("Reset demo data? (This clears saved localStorage)");
                            if (!ok) return;
                            localStorage.removeItem(STORAGE_KEY);
                            window.location.reload();
                        }}
                    >

                        Reset

                    </button>
                </div>
            </div>

            {busyAction && (
                <div className="topLoader" aria-hidden="true">
                    <div className="bar" />
                </div>
            )}

            <div className="panel">
                <h2>Doctors</h2>

                <div className="row rowDoctors">
                    <input
                        placeholder="Full name"
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, name: e.target.value }))}
                        disabled={busyAction}
                    />
                    <input
                        placeholder="Phone"
                        value={doctorForm.phone}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))}
                        disabled={busyAction}
                    />
                    <input
                        placeholder="Specialization"
                        value={doctorForm.spec}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, spec: e.target.value }))}
                        disabled={busyAction}
                    />

                    <button onClick={addOrSaveDoctor} disabled={busyAction}>
                        {busyAction ? "Saving…" : editingId ? "Save" : "Add"}
                    </button>

                    {editingId && (
                        <button
                            className="ghost"
                            disabled={busyAction}
                            onClick={() => {
                                setEditingId(null);
                                setDoctorErr("");
                                setDoctorForm({ name: "", phone: "", spec: "" });
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {doctorErr && <div className="note warn">{doctorErr}</div>}

                <div className="list">
                    {doctors.map((d) => (
                        <div key={d.id} className="item">
                            <div>
                                <b>{d.name}</b>
                                <div className="muted">
                                    {d.spec} • {d.phone}
                                </div>
                            </div>
                            <div className="btns">
                                <button className="ghost" disabled={busyAction} onClick={() => editDoctor(d)}>
                                    Edit
                                </button>
                                <button className="danger" disabled={busyAction} onClick={() => deleteDoctor(d.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {!doctors.length && (
                        <div className="empty">
                            <div className="emptyTitle">No doctors yet</div>
                            <div className="muted">Add your first doctor above.</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="panel">
                <h2>Appointments</h2>

                <div className="row rowAppts">
                    <select
                        value={apptForm.doctorId}
                        onChange={(e) => setApptForm((p) => ({ ...p, doctorId: e.target.value }))}
                        disabled={busyAction}
                    >
                        <option value="">Select doctor</option>
                        {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>

                    <input
                        placeholder="Patient name"
                        value={apptForm.patient}
                        onChange={(e) => setApptForm((p) => ({ ...p, patient: e.target.value }))}
                        disabled={busyAction}
                    />

                    <div className="dateBlock">
                        <input
                            type="date"
                            value={apptForm.date}
                            min={today}
                            onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))}
                            disabled={busyAction}
                        />
                        <div className="quick">
                            <button
                                className="chip"
                                disabled={busyAction}
                                onClick={() => setApptForm((p) => ({ ...p, date: today }))}
                            >
                                Today
                            </button>
                            <button
                                className="chip"
                                disabled={busyAction}
                                onClick={() => setApptForm((p) => ({ ...p, date: tomorrow }))}
                            >
                                Tomorrow
                            </button>
                        </div>
                    </div>

                    <select
                        value={apptForm.time}
                        onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))}
                        disabled={!apptForm.doctorId || busyAction}
                    >
                        {slots.map((t) => {
                            const busy = busyAdd.has(t);
                            return (
                                <option key={t} value={t} disabled={busy}>
                                    {t}
                                    {busy ? " (busy)" : ""}
                                </option>
                            );
                        })}
                    </select>

                    <button onClick={addAppointment} disabled={!doctors.length || busyAction}>
                        {busyAction ? "Saving…" : "Add"}
                    </button>
                </div>

                <div className="hint">
                    Busy time is disabled. If time becomes busy — app moves to next free slot.
                </div>

                <div className="list">
                    {sortedAppts.map((a) => {
                        const doc = doctors.find((d) => d.id === a.doctorId);
                        const statusClass =
                            a.status === "done"
                                ? "stDone"
                                : a.status === "cancelled"
                                    ? "stCancelled"
                                    : "stScheduled";


                        return (
                            <div key={a.id} className={`item appt ${a.status === "cancelled" ? "faded" : ""}`}>
                                <div>
                                    <div className="topLine">
                                        <b>{a.patient}</b>
                                        <span className={`status ${statusClass}`}>{a.status}</span>
                                    </div>
                                    <div className="muted">
                                        {a.date} • {a.time} • {doc ? doc.name : "Unknown doctor"}
                                    </div>
                                </div>

                                <div className="btns">
                                    <button className="ghost" disabled={busyAction || a.status === "cancelled"} onClick={() => openMove(a)}>
                                        Move
                                    </button>


                                    <button className="ghost" disabled={busyAction || a.status === "cancelled"} onClick={() => toggleDone(a.id)}>
                                        {a.status === "done" ? "Undo" : "Done"}
                                    </button>

                                    <button className="ghost" disabled={busyAction || a.status === "cancelled"} onClick={() => cancelAppt(a.id)}>
                                        Cancel
                                    </button>

                                    <button className="danger" disabled={busyAction} onClick={() => deleteAppt(a.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!sortedAppts.length && (
                        <div className="empty">
                            <div className="emptyTitle">No appointments yet</div>
                            <div className="muted">Add one above — choose doctor, date and time.</div>
                        </div>
                    )}
                </div>
            </div>

            {moveModal && (
                <div className="modalOverlay" onClick={() => !busyAction && setMoveModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modalHead">
                            <h3>Move appointment</h3>
                            <button className="ghost" disabled={busyAction} onClick={() => setMoveModal(null)}>
                                ✕
                            </button>

                        </div>

                        <div className="modalSub muted">
                            {moveModal.patient} • {moveModal.date} {moveModal.time}
                        </div>


                        <div className="modalRow">
                            <label>
                                Doctor
                                <select
                                    value={moveForm.doctorId}
                                    onChange={(e) => setMoveForm((p) => ({ ...p, doctorId: e.target.value }))}
                                    disabled={busyAction}
                                >
                                    <option value="">Select doctor</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>

                            </label>

                            <label>
                                Date
                                <input
                                    type="date"
                                    value={moveForm.date}
                                    min={today}
                                    onChange={(e) => setMoveForm((p) => ({ ...p, date: e.target.value }))}
                                    disabled={busyAction}
                                />
                                <div className="quick">
                                    <button className="chip" disabled={busyAction} onClick={() => setMoveForm((p) => ({ ...p, date: today }))}>
                                        Today
                                    </button>
                                    <button className="chip" disabled={busyAction} onClick={() => setMoveForm((p) => ({ ...p, date: tomorrow }))}>
                                        Tomorrow
                                    </button>
                                </div>
                            </label>

                            <label>
                                Time
                                <select
                                    value={moveForm.time}
                                    onChange={(e) => setMoveForm((p) => ({ ...p, time: e.target.value }))}
                                    disabled={!moveForm.doctorId || busyAction}
                                >
                                    {(() => {
                                        const busy =
                                            moveForm.doctorId && moveForm.date
                                                ? busySetFor(moveForm.doctorId, moveForm.date, moveModal.id)
                                                : new Set();

                                        return slots.map((t) => {
                                            const isBusy = busy.has(t);
                                            const isCurrent =
                                                moveModal.doctorId === moveForm.doctorId &&
                                                moveModal.date === moveForm.date &&
                                                moveModal.time === t;

                                            const disabled = isBusy && !isCurrent;

                                            return (
                                                <option key={t} value={t} disabled={disabled}>
                                                    {t}
                                                    {isBusy && !isCurrent ? " (busy)" : ""}
                                                </option>

                                            );


                                        });

                                    })()}


                                </select>

                            </label>
                        </div>

                        <div className="btns">
                            <button
                                onClick={confirmMove}
                                disabled={busyAction || !moveForm.doctorId || !moveForm.date || !moveForm.time}
                            >
                                {busyAction ? "Saving…" : "Confirm"}
                            </button>
                            <button className="ghost" disabled={busyAction} onClick={() => setMoveModal(null)}>
                                Close
                            </button>
                        </div>

                        {moveMsg && <div className="note">{moveMsg}</div>}
                    </div>

                </div>

            )}

            {toast && <div className="toast">{toast.text}</div>}
        </div>


    );



}