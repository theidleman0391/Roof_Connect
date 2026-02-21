import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    created_at: string;
}

const Registry: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (user) fetchCustomers();
    }, [user]);

    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    user_id: user.id,
                    ...formData
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setCustomers([data, ...customers]);
                setIsModalOpen(false);
                setFormData({ name: '', phone: '', email: '', address: '' });
            }
        } catch (error) {
            console.error('Error saving customer:', error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map data to database columns
                // Expecting columns: Name, Phone, Email, Address (case insensitive roughly)
                const customersToInsert = data.map((row: any) => ({
                    user_id: user.id,
                    name: row['Name'] || row['name'] || row['Customer Name'] || 'Unknown',
                    phone: row['Phone'] || row['phone'] || row['Mobile'] || null,
                    email: row['Email'] || row['email'] || null,
                    address: row['Address'] || row['address'] || null
                })).filter(c => c.name !== 'Unknown');

                if (customersToInsert.length > 0) {
                    const { data: insertedData, error } = await supabase
                        .from('customers')
                        .insert(customersToInsert)
                        .select();

                    if (error) throw error;

                    if (insertedData) {
                        setCustomers([...insertedData, ...customers]);
                        alert(`Successfully imported ${insertedData.length} customers.`);
                    }
                } else {
                    alert("No valid customer data found in file. Please ensure columns are named 'Name', 'Phone', 'Email', 'Address'.");
                }

            } catch (error) {
                console.error("Error importing file:", error);
                alert("Error importing file. Please check the format.");
            } finally {
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const sortedCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="registry" />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">groups</span>
                        Customer Registry
                    </h1>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                            Import
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            Add Customer
                        </button>
                    </div>
                </header>

                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="relative max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-slate-400">Loading...</div>
                    ) : sortedCustomers.length === 0 ? (
                        <div className="text-center text-slate-400 mt-20">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">person_off</span>
                            <p>No customers found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedCustomers.map(customer => (
                                <div key={customer.id} className="bg-white dark:bg-[#1a1d21] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-lg">{customer.name}</h3>
                                        <span className="text-xs text-slate-400">{new Date(customer.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                                {customer.phone}
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                                                {customer.email}
                                            </div>
                                        )}
                                        {customer.address && (
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
                                                {customer.address}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1a1d21] w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Add Customer</h2>
                            <button onClick={() => setIsModalOpen(false)}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Name</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Phone</label>
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Address</label>
                                <input
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2"
                                />
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg mt-4">
                                Save Customer
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Registry;
