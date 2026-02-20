import { useMemo, useState } from "react";
import "./index.css";

const pad = (n) => String(n).padStart(2, "0");

function makeSlots() {
    const out = [];
    for (let h = 9; h <= 17; h++) {
        out.push(`${pad(h)}:00`);
        if (h !== 17) out.push(`${pad(h)}:30`)


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
                a.time === t
        );
        if (!busy) return t;
    }

    return null;
}

export default function App() {
    const slots = useMemo(() => makeSlots(), []);
    const today = new Date().toISOString().slice(0, 10);

    const [doctors, setDoctors] = useState([


        {
            id: crypto.randomUUID(),
            name: "Dr. Anna Petrova",
            phone: "+44 7700 900123",
            spec: "Dentist",
        },
    ]);

    const [doctorForm, setDoctorForm] = useState({ name: "", phone: "", spec: "" });
    const [editingId, setEditingId] = useState(null);


    const [appts, setAppts] = useState([
        {
            id: crypto.randomUUID(),
            doctorId: doctors[0]?.id,
            patient: "Demo",
            date: today,
            time: "10:00",
        },


    ]);

    const [apptForm, setApptForm] = useState({
        doctorId: doctors[0]?.id || "",
        patient: "",

        date: today,
        time: "09:00",
    });

    const [moveModal, setMoveModal] = useState(null);
    const [moveForm, setMoveForm] = useState({
        doctorId: "",
        date: today,

        time: "09:00",
    });
    const [moveMsg, setMoveMsg] = useState("");

    const addOrSaveDoctor = () => {
        const data = {
            name: doctorForm.name.trim(),
            phone: doctorForm.phone.trim(),
            spec: doctorForm.spec.trim(),
        };
        if (!data.name || !data.phone || !data.spec) return;


        if (editingId) {
            setDoctors((p) => p.map((d) => (d.id === editingId ? { ...d, ...data } : d)));
            setEditingId(null);

        } else {
            const id = crypto.randomUUID();
            setDoctors((p) => [{ id, ...data }, ...p]);
            setApptForm((f) => (f.doctorId ? f : { ...f, doctorId: id }));
        }

        setDoctorForm({ name: "", phone: "", spec: "" });

    };

    const editDoctor = (doc) => {
        setEditingId(doc.id);
        setDoctorForm({ name: doc.name, phone: doc.phone, spec: doc.spec });
    };

    const deleteDoctor = (id) => {
        setDoctors((p) => p.filter((d) => d.id !== id));
        setAppts((p) => p.filter((a) => a.doctorId !== id));
        setApptForm((f) => (f.doctorId === id ? { ...f, doctorId: "" } : f));
    };

    const addAppointment = () => {
        const doctorId = apptForm.doctorId;
        const patient = apptForm.patient.trim();
        const date = apptForm.date;
        const time = apptForm.time;



        if (!doctorId || !patient || !date || !time) return;

        const freeTime = nextFreeSlot(doctorId, date, time, slots, appts);
        if (!freeTime) return;

        setAppts((p) => [{ id: crypto.randomUUID(), doctorId, patient, date, time: freeTime }, ...p]);
        setApptForm((f) => ({ ...f, patient: "" }));
    };

    const deleteAppt = (id) => setAppts((p) => p.filter((a) => a.id !== id));

    const openMove = (appt) => {
        setMoveMsg("");
        setMoveModal(appt);
        setMoveForm({
            doctorId: appt.doctorId,
            date: appt.date,
            time: appt.time,
        });
    };



    const confirmMove = () => {
        if (!moveModal) return;

            const doctorId = moveForm.doctorId;
        const date = moveForm.date;
        const time = moveForm.time;

        if (!doctorId || !date || !time) return;

        const freeTime = nextFreeSlot(doctorId, date, time, slots, appts, moveModal.id);

        if (!freeTime) {
            setMoveMsg("No free slots for this day.");
            return;
        }

        if (freeTime !== time) {
            setMoveMsg(`Selected time is busy. Moved to ${freeTime}.`);
        } else {

            setMoveMsg("Moved ✅");
        }

        setAppts((p) =>
            p.map((a) =>
                a.id === moveModal.id ? { ...a, doctorId, date, time: freeTime } : a
            )
        );

        setTimeout(() => {
            setMoveModal(null);
            setMoveMsg("");
        }, 600);


    };





    return (
        <div className="wrap">
            <h1>Clinic</h1>

            <div className="panel">
                <h2>Doctors</h2>

                <div className="row rowDoctors">
                    <input
                        placeholder="Full name"
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                        placeholder="Phone"
                        value={doctorForm.phone}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                    <input
                        placeholder="Specialization"
                        value={doctorForm.spec}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, spec: e.target.value }))}
                    />

                    <button onClick={addOrSaveDoctor}>{editingId ? "Save" : "Add"}</button>

                    {editingId && (
                        <button
                            className="ghost"
                            onClick={() => {
                                setEditingId(null);
                                setDoctorForm({ name: "", phone: "", spec: "" });
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

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
                                <button className="ghost" onClick={() => editDoctor(d)}>
                                    Edit
                                </button>
                                <button className="danger" onClick={() => deleteDoctor(d.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {!doctors.length && <div className="muted">No doctors yet</div>}
                </div>
            </div>

            <div className="panel">
                <h2>Appointments</h2>

                <div className="row rowAppts">
                    <select
                        value={apptForm.doctorId}
                        onChange={(e) => setApptForm((p) => ({ ...p, doctorId: e.target.value }))}
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
                    />

                    <input
                        type="date"
                        value={apptForm.date}
                        onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))}
                    />

                    <select
                        value={apptForm.time}
                        onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))}
                    >
                        {slots.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>

                    <button onClick={addAppointment}>Add</button>
                </div>

                <div className="hint">
                    If selected time is busy, app auto-picks the next free slot.
                </div>

                <div className="list">
                    {appts.map((a) => {
                        const doc = doctors.find((d) => d.id === a.doctorId);
                        return (
                            <div key={a.id} className="item">
                                <div>
                                    <b>{a.patient}</b>
                                    <div className="muted">
                                        {a.date} • {a.time} • {doc ? doc.name : "Unknown doctor"}
                                    </div>
                                </div>
                                <div className="btns">
                                    <button className="ghost" onClick={() => openMove(a)}>
                                        Move
                                    </button>
                                    <button className="danger" onClick={() => deleteAppt(a.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!appts.length && <div className="muted">No appointments yet</div>}
                </div>
            </div>

            {moveModal && (
                <div className="modalOverlay" onClick={() => setMoveModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Move appointment</h3>

                        <div className="modalRow">
                            <label>
                                Doctor
                                <select
                                    value={moveForm.doctorId}
                                    onChange={(e) => setMoveForm((p) => ({ ...p, doctorId: e.target.value }))}
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
                                    onChange={(e) => setMoveForm((p) => ({ ...p, date: e.target.value }))}
                                />
                            </label>

                            <label>
                                Time
                                <select
                                    value={moveForm.time}
                                    onChange={(e) => setMoveForm((p) => ({ ...p, time: e.target.value }))}
                                >
                                    {slots.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="btns">
                            <button onClick={confirmMove} disabled={!moveForm.doctorId || !moveForm.date || !moveForm.time}>
                                Confirm
                            </button>
                            <button className="ghost" onClick={() => setMoveModal(null)}>
                                Close

                            </button>



                        </div>

                        {moveMsg && <div className="note">{moveMsg}</div>}
                    </div>





                </div>


            )}



        </div>
    );


}
