import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase'; // Adjusted import path
import { Link } from 'react-router-dom';

const AdminDashboardScreen = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const q = query(collection(db, 'assessments'), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                const assessmentsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toLocaleString() || 'N/A'
                }));
                setAssessments(assessmentsData);
            } catch (error) {
                console.error("Error fetching assessments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssessments();
    }, []);

    if (loading) {
        return <div className="text-white text-center p-10">Loading assessments...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-800 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <Link to="/onboarding" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                        &larr; Back to App
                    </Link>
                </div>

                <div className="bg-slate-900 rounded-lg shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700 text-slate-300 uppercase text-sm">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">User ID</th>
                                <th className="p-4">Score</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {assessments.map(assessment => (
                                <tr key={assessment.id} className="hover:bg-slate-800">
                                    <td className="p-4 font-mono text-sm">{assessment.timestamp}</td>
                                    <td className="p-4 font-mono text-sm">{assessment.userId}</td>
                                    <td className="p-4 font-bold">{assessment.score} / {assessment.total}</td>
                                    <td className="p-4">
                                        <button onClick={() => alert(JSON.stringify(assessment.details, null, 2))} className="text-blue-400 hover:underline text-sm">
                                            View Evidence
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;