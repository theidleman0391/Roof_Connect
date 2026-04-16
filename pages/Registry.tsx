import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    created_at: string;
}

const emptyForm = { name: '', phone: '', email: '', address: '' };

const Registry: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detail, setDetail] = useState<Customer | null>(null);
    const [editing, setEditing] = useState<Customer | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        if (user) fetchCustomers();
    }, [user]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setCustomers(data);
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            toast.error(error.message || 'Failed to load customers');
        } finally {
            setIsLoading(false);
        }
    };

    const openAdd = () => {
        setEditing(null);
        setFormData(emptyForm);
        setIsModalOpen(true);
    };

    const openEdit = (c: Customer) => {
        setEditing(c);
        setFormData({
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
        });
        setDetail(null);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            if (editing) {
                const { data, error } = await supabase
                    .from('customers')
                    .update(formData)
                    .eq('id', editing.id)
                    .select()
                    .single();
                if (error) throw error;
                if (data) {
                    setCustomers(prev => prev.map(c => (c.id === data.id ? data : c)));
                    toast.success(`Updated ${data.name}`);
                }
            } else {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([{ user_id: user.id, ...formData }])
                    .select()
                    .single();
                if (error) throw error;
                if (data) {
                    setCustomers([data, ...customers]);
                    toast.success(`Added ${data.name}`);
                }
            }
            setIsModalOpen(false);
            setFormData(emptyForm);
            setEditing(null);
        } catch (error: any) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Failed to save customer');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (customer: Customer) => {
        const ok = await confirm({
            title: 'Delete customer?',
            message: `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;

        const prev = customers;
        setCustomers(cs => cs.filter(c => c.id !== customer.id));
        setDetail(null);

        try {
            const { error } = await supabase.from('customers').delete().eq('id', customer.id);
            if (error) throw error;
            toast.success(`Deleted ${customer.name}`);
        } catch (error: any) {
            setCustomers(prev);
            toast.error(error.message || 'Failed to delete customer');
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        const ok = await confirm({
            title: `Delete ${ids.length} customer${ids.length > 1 ? 's' : ''}?`,
            message: 'This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;

        const prev = customers;
        setCustomers(cs => cs.filter(c => !selected.has(c.id)));
        setSelected(new Set());

        try {
            const { error } = await supabase.from('customers').delete().in('id', ids);
            if (error) throw error;
            toast.success(`Deleted ${ids.length} customer${ids.length > 1 ? 's' : ''}`);
        } catch (error: any) {
            setCustomers(prev);
            toast.error(error.message || 'Bulk delete failed');
        }
    };

    const handleExportSelected = () => {
        const rows = customers.filter(c => selected.has(c.id));
        if (rows.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
            Name: r.name,
            Phone: r.phone,
            Email: r.email,
            Address: r.address,
            CreatedAt: r.created_at,
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, `customers-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`Exported ${rows.length} customer${rows.length > 1 ? 's' : ''}`);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

                const toInsert = data
                    .map((row: any) => ({
                        user_id: user.id,
                        name: row['Name'] || row['name'] || row['Customer Name'] || 'Unknown',
                        phone: row['Phone'] || row['phone'] || row['Mobile'] || null,
                        email: row['Email'] || row['email'] || null,
                        address: row['Address'] || row['address'] || null,
                    }))
                    .filter(c => c.name !== 'Unknown');

                if (toInsert.length === 0) {
                    toast.warning("No valid rows found. Expected columns: 'Name', 'Phone', 'Email', 'Address'.");
                    return;
                }

                const { data: inserted, error } = await supabase.from('customers').insert(toInsert).select();
                if (error) throw error;
                if (inserted) {
                    setCustomers([...inserted, ...customers]);
                    toast.success(`Imported ${inserted.length} customer${inserted.length > 1 ? 's' : ''}`);
                }
            } catch (error: any) {
                console.error('Error importing file:', error);
                toast.error(error.message || 'Error importing file. Please check the format.');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const filtered = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.phone || '').includes(searchTerm) ||
            (c.email || '').toLowerCase().includes(q)
        );
    }, [customers, searchTerm]);

    const toggleOne = (id: string) => {
        setSelected(s => {
            const next = new Set(s);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(c => c.id)));
    };

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-white">
            <Sidebar active="registry" />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 bg-white dark:bg-[#1a1d21] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Icon name="groups" className="text-primary" />
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
                        <Button variant="success" icon="upload_file" onClick={() => fileInputRef.current?.click()}>
                            Import
                        </Button>
                        <Button icon="add" onClick={openAdd}>
                            Add Customer
                        </Button>
                    </div>
                </header>

                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 max-w-md">
                        <Icon name="search" className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                        {filtered.length} of {customers.length} customers
                    </span>
                    {selected.size > 0 && (
                        <div className="ml-auto flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                            <span className="text-sm font-bold text-primary">{selected.size} selected</span>
                            <Button size="sm" variant="secondary" icon="download" onClick={handleExportSelected}>
                                Export
                            </Button>
                            <Button size="sm" variant="danger" icon="delete" onClick={handleBulkDelete}>
                                Delete
                            </Button>
                            <button
                                onClick={() => setSelected(new Set())}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        customers.length === 0 ? (
                            <EmptyState
                                icon="person_add"
                                title="No customers yet"
                                description="Add your first customer or import a list from Excel to get started."
                                action={<Button icon="add" onClick={openAdd}>Add your first customer</Button>}
                            />
                        ) : (
                            <EmptyState
                                icon="search_off"
                                title="No matches"
                                description={`No customers match "${searchTerm}". Try a different search.`}
                            />
                        )
                    ) : (
                        <>
                            <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                                <input
                                    type="checkbox"
                                    checked={selected.size === filtered.length && filtered.length > 0}
                                    onChange={toggleAll}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <span>Select all visible</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.map(customer => (
                                    <Card
                                        key={customer.id}
                                        interactive
                                        onClick={() => setDetail(customer)}
                                        className={selected.has(customer.id) ? 'ring-2 ring-primary' : ''}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(customer.id)}
                                                    onChange={(e) => { e.stopPropagation(); toggleOne(customer.id); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded flex-shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-lg truncate">{customer.name}</h3>
                                                    <p className="text-xs text-slate-400">
                                                        Added {new Date(customer.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300 ml-7">
                                            {customer.phone && (
                                                <div className="flex items-center gap-2 truncate">
                                                    <Icon name="call" size={16} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{customer.phone}</span>
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div className="flex items-center gap-2 truncate">
                                                    <Icon name="mail" size={16} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{customer.email}</span>
                                                </div>
                                            )}
                                            {customer.address && (
                                                <div className="flex items-center gap-2 truncate">
                                                    <Icon name="location_on" size={16} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{customer.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditing(null); }}
                title={editing ? 'Edit Customer' : 'Add Customer'}
                titleIcon={editing ? 'edit' : 'person_add'}
            >
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <Input
                        label="Name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Phone"
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Address"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setIsModalOpen(false); setEditing(null); }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={saving}>
                            {editing ? 'Save changes' : 'Add customer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!detail}
                onClose={() => setDetail(null)}
                title={detail?.name || ''}
                titleIcon="person"
                size="md"
            >
                {detail && (
                    <div className="p-6 space-y-4">
                        <dl className="space-y-3 text-sm">
                            {detail.phone && (
                                <div className="flex items-start gap-3">
                                    <Icon name="call" className="text-slate-400 mt-0.5" size={18} />
                                    <div>
                                        <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Phone</dt>
                                        <dd className="text-slate-900 dark:text-white">
                                            <a href={`tel:${detail.phone}`} className="hover:text-primary">{detail.phone}</a>
                                        </dd>
                                    </div>
                                </div>
                            )}
                            {detail.email && (
                                <div className="flex items-start gap-3">
                                    <Icon name="mail" className="text-slate-400 mt-0.5" size={18} />
                                    <div>
                                        <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email</dt>
                                        <dd className="text-slate-900 dark:text-white">
                                            <a href={`mailto:${detail.email}`} className="hover:text-primary">{detail.email}</a>
                                        </dd>
                                    </div>
                                </div>
                            )}
                            {detail.address && (
                                <div className="flex items-start gap-3">
                                    <Icon name="location_on" className="text-slate-400 mt-0.5" size={18} />
                                    <div>
                                        <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Address</dt>
                                        <dd className="text-slate-900 dark:text-white">{detail.address}</dd>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <Icon name="event" className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <dt className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Added</dt>
                                    <dd className="text-slate-900 dark:text-white">
                                        {new Date(detail.created_at).toLocaleString()}
                                    </dd>
                                </div>
                            </div>
                        </dl>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button variant="danger" icon="delete" onClick={() => handleDelete(detail)}>
                                Delete
                            </Button>
                            <Button variant="secondary" icon="edit" onClick={() => openEdit(detail)}>
                                Edit
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Registry;
