import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AdminDashboard = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {

        const fetchAssessments = async () => {
            try {
                setLoading(true);
                const assessmentsCol = collection(db, 'assessments');
                const q = query(assessmentsCol, orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                const assessmentsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAssessments(assessmentsData);
                setError(null);
            } catch (err) {
                console.error("Error fetching assessments:", err);
                setError("Failed to load assessment data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAssessments();
    }, []);

    const handleOverride = async (assessmentId, detailIndex) => {
        if (!window.confirm("Are you sure you want to override this result to PASS?")) {
            return;
        }

        try {
            const assessmentRef = doc(db, 'assessments', assessmentId);
            const assessmentSnap = await getDoc(assessmentRef);

            if (!assessmentSnap.exists()) {
                throw new Error("Assessment document not found!");
            }

            const assessmentData = assessmentSnap.data();
            const newDetails = [...assessmentData.details];

            // Ensure we are only overriding a failed result
            if (newDetails[detailIndex].result === 'fail') {
                newDetails[detailIndex].result = 'pass';

                // Update the document with the new details array and incremented score
                await updateDoc(assessmentRef, {
                    details: newDetails,
                    score: assessmentData.score + 1
                });

                // Refresh local state to reflect the change immediately
                setAssessments(prev => prev.map(asm =>
                    asm.id === assessmentId
                        ? { ...asm, details: newDetails, score: asm.score + 1 }
                        : asm
                ));
                alert("Override successful!");
            } else {
                alert("This result is already marked as PASS.");
            }
        } catch (err) {
            console.error("Error overriding result:", err);
            alert(`Failed to override result: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="text-2xl font-bold animate-pulse">Loading Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-200">Admin Dashboard</h1>
                    <Link to="/" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold">Back to Assessment</Link>
                </div>

                {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">{error}</div>}

                <div className="bg-slate-800 rounded-2xl shadow-lg">
                    {assessments.map(asm => (
                        <div key={asm.id} className="border-b border-slate-700 last:border-b-0">
                            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/50" onClick={() => setExpandedId(expandedId === asm.id ? null : asm.id)}>
                                <div>
                                    <p className="font-mono text-xs text-slate-400">{asm.id}</p>
                                    <p className="font-bold text-lg text-slate-200">User: <span className="font-normal text-slate-300">{asm.userId.substring(0, 15)}...</span></p>
                                    <p className="text-sm text-slate-400">Date: {new Date(asm.timestamp?.toDate()).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">Score: {asm.score}/{asm.total}</p>
                                    <span className="text-sm text-slate-400">{expandedId === asm.id ? 'Collapse' : 'Expand'}</span>
                                </div>
                            </div>
                            {expandedId === asm.id && (
                                <div className="bg-slate-900/50 p-4">
                                    <h3 className="font-bold mb-2 text-slate-300">Details:</h3>
                                    <ul className="space-y-4">
                                        {asm.details.map((detail, index) => (
                                            <li key={index} className="p-3 bg-slate-800 rounded-lg flex flex-col md:flex-row gap-4 items-start">
                                                <div className="flex-grow">
                                                    <p className="font-bold">{detail.signal}</p>
                                                    <p className={`font-mono text-sm ${detail.result === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                                        Result: {detail.result.toUpperCase()}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Time: {detail.timeTaken.toFixed(2)}s</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {detail.evidence?.imageUrl && (
                                                        <img src={detail.evidence.imageUrl} alt={`Evidence for ${detail.signal}`} className="w-48 h-auto rounded border-2 border-slate-600" />
                                                    )}
                                                    {detail.evidence?.transcript && (
                                                        <div className="w-48 p-2 bg-slate-700 rounded text-xs">
                                                            <p>Transcript: "{detail.evidence.transcript}"</p>
                                                            <p>Confidence: {(detail.evidence.confidence * 100).toFixed(1)}%</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {detail.result === 'fail' && (
                                                    <button onClick={() => handleOverride(asm.id, index)} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded text-sm self-center">
                                                        Override to PASS
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;