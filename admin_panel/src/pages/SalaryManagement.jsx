import React, { useState } from 'react';
import { Search, DollarSign, Calendar, CheckCircle, Clock, Filter, CreditCard, Edit, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import TableFilterHeader from '../components/TableFilterHeader';
import DateRangePicker, { formatDate } from '../components/DateRangePicker';

const SalaryManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSalary, setEditingSalary] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    // Mock Data for UI demonstration
    const [salaries, setSalaries] = useState([
        { id: 1, name: 'Sarah Wilson', employeeId: 'TCH001', role: 'Senior Teacher', baseSalary: 4500, status: 'Pending', lastPaid: '2023-09-30', bonus: 0, deductions: 0 },
        { id: 2, name: 'Mike Johnson', employeeId: 'TCH002', role: 'Math Teacher', baseSalary: 4200, status: 'Paid', lastPaid: '2023-10-30', bonus: 200, deductions: 50 },
        { id: 3, name: 'Emily Davis', employeeId: 'TCH003', role: 'Science Teacher', baseSalary: 4200, status: 'Paid', lastPaid: '2023-10-31', bonus: 0, deductions: 0 },
        { id: 4, name: 'Robert Brown', employeeId: 'TCH004', role: 'History Teacher', baseSalary: 4000, status: 'Overdue', lastPaid: '2023-09-30', bonus: 0, deductions: 100 },
        { id: 5, name: 'Lisa Anderson', employeeId: 'TCH005', role: 'English Teacher', baseSalary: 4100, status: 'Pending', lastPaid: '2023-09-30', bonus: 150, deductions: 0 },
    ]);

    const showToast = (message, type = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'info') toast.info(message);
        else toast.error(message);
    };

    const handleProcessPayment = (teacher) => {
        setSelectedTeacher(teacher);
        setEditingSalary(null);
        setIsModalOpen(true);
    };

    const handleEditSalary = (teacher) => {
        setEditingSalary(teacher);
        setSelectedTeacher(null);
        setIsModalOpen(true);
    };

    const handleProcessAll = () => {
        const pendingCount = salaries.filter(s => s.status !== 'Paid').length;
        if (pendingCount === 0) {
            showToast('No pending payments to process', 'info');
            return;
        }
        if (window.confirm(`Are you sure you want to process payments for ${pendingCount} employees?`)) {
            setSalaries(salaries.map(s =>
                s.status !== 'Paid' ? { ...s, status: 'Paid', lastPaid: formatDate(new Date()) } : s
            ));
            showToast(`Successfully processed ${pendingCount} payments`);
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredSalaries.map(s => ({
            "Employee": s.name,
            "Role": s.role,
            "Employee ID": s.employeeId,
            "Total Pay": `$${(s.baseSalary + s.bonus - s.deductions).toLocaleString()}`,
            "Status": s.status,
            "Last Paid": s.lastPaid
        }));
        exportToExcel(dataToExport, "Salary_Report");
        showToast('Excel report downloaded successfully');
    };

    const handleExportPDF = () => {
        const columns = ["Employee", "Role", "ID", "Total Pay", "Status", "Last Paid"];
        const dataToExport = filteredSalaries.map(s => [
            s.name,
            s.role,
            s.employeeId,
            `$${(s.baseSalary + s.bonus - s.deductions).toLocaleString()}`,
            s.status,
            s.lastPaid
        ]);
        exportToPDF(columns, dataToExport, "Salary_Report", "Salary Report");
        showToast('PDF report downloaded successfully');
    };

    const confirmPayment = () => {
        if (!selectedTeacher) return;
        setSalaries(salaries.map(s =>
            s.id === selectedTeacher.id ? { ...s, status: 'Paid', lastPaid: formatDate(new Date()) } : s
        ));
        showToast(`Salary processed for ${selectedTeacher.name}`);
        setIsModalOpen(false);
        setSelectedTeacher(null);
    };

    const updateSalaryDetails = (e) => {
        e.preventDefault();
        if (!editingSalary) return;
        const formData = new FormData(e.target);

        setSalaries(salaries.map(s =>
            s.id === editingSalary.id ? {
                ...s,
                baseSalary: Number(formData.get('baseSalary')),
                bonus: Number(formData.get('bonus')),
                deductions: Number(formData.get('deductions'))
            } : s
        ));

        showToast(`Salary details updated for ${editingSalary.name}`);
        setIsModalOpen(false);
        setEditingSalary(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Overdue': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const filteredSalaries = salaries.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || s.status === statusFilter;
        const matchesRole = !roleFilter || s.role === roleFilter;
        
        let matchesDate = true;
        if (dateRange.start || dateRange.end) {
            const fDate = new Date(s.lastPaid);
            if (dateRange.start && dateRange.end) {
                matchesDate = fDate >= new Date(dateRange.start) && fDate <= new Date(dateRange.end);
            } else if (dateRange.start) {
                matchesDate = fDate >= new Date(dateRange.start);
            } else if (dateRange.end) {
                matchesDate = fDate <= new Date(dateRange.end);
            }
        }
        
        return matchesSearch && matchesStatus && matchesRole && matchesDate;
    });

    const uniqueRoles = [...new Set(salaries.map(s => s.role))];

    const totalPayout = salaries.reduce((acc, curr) => acc + curr.baseSalary + curr.bonus - curr.deductions, 0);
    const pendingPayout = salaries.filter(s => s.status !== 'Paid').reduce((acc, curr) => acc + curr.baseSalary + curr.bonus - curr.deductions, 0);

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Salary Management</h1>
                    <p className="text-slate-600 text-sm">Manage teacher salaries and payouts</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleProcessAll} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-medium flex items-center gap-2 shadow-sm transition active:scale-95 text-sm">
                        <CreditCard size={16} /> Process All
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Monthly Payout</p>
                            <h3 className="text-2xl font-bold text-slate-900">${totalPayout.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
                            <h3 className="text-2xl font-bold text-slate-900">${pendingPayout.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Paid Employees</p>
                            <h3 className="text-2xl font-bold text-slate-900">{salaries.filter(s => s.status === 'Paid').length} / {salaries.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-200">
                    <div style={{ flexShrink: 0 }}>
          <TableFilterHeader
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchPlaceholder="Search by name or ID..."
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        filters={[
                            {
                                name: "status",
                                label: "All Statuses",
                                value: statusFilter,
                                onChange: setStatusFilter,
                                options: [
                                    { value: "", label: "All Statuses" },
                                    { value: "Paid", label: "Paid" },
                                    { value: "Pending", label: "Pending" },
                                    { value: "Overdue", label: "Overdue" }
                                ]
                            },
                            {
                                name: "role",
                                label: "All Roles",
                                value: roleFilter,
                                onChange: setRoleFilter,
                                options: [
                                    { value: "", label: "All Roles" },
                                    ...uniqueRoles.map(role => ({ value: role, label: role }))
                                ]
                            }
                        ]}
                    >
                        <DateRangePicker onRangeChange={setDateRange} />
                    </TableFilterHeader>
        </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 uppercase font-semibold text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2">Employee</th>
                                <th className="px-4 py-2">Total Pay</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Last Paid</th>
                                <th className="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredSalaries.map((salary) => (
                                <tr key={salary.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-sm">{salary.name}</span>
                                            <span className="text-[11px] text-slate-500 bg-slate-100 rounded-md px-2 py-0.5 mt-1 w-fit">{salary.role} • {salary.employeeId}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 font-medium text-slate-900">
                                        <div className="text-base">${(salary.baseSalary + salary.bonus - salary.deductions).toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            Base: ${salary.baseSalary} | B: ${salary.bonus} | D: ${salary.deductions}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(salary.status)}`}>
                                            {salary.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 font-medium text-sm">
                                        {salary.lastPaid}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleEditSalary(salary)}
                                                className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all text-xs font-medium flex items-center gap-1"
                                                title="Edit Salary"
                                            >
                                                <Edit size={14} /> Edit
                                            </button>
                                            {salary.status !== 'Paid' && (
                                                <button
                                                    onClick={() => handleProcessPayment(salary)}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1"
                                                >
                                                    Pay
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        {selectedTeacher && (
                            <>
                                <div className="p-6 border-b border-slate-100 bg-slate-50">
                                    <h3 className="text-lg font-bold text-slate-900">Confirm Payment</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-white shadow-sm p-5 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-slate-500 text-sm">Employee</span>
                                            <span className="font-semibold text-slate-900">{selectedTeacher.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-slate-500 text-sm">Base Salary</span>
                                            <span className="font-semibold text-slate-900">${selectedTeacher.baseSalary}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-3 text-emerald-600">
                                            <span className="text-sm">Bonus</span>
                                            <span className="font-semibold">+${selectedTeacher.bonus}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-rose-600">
                                            <span className="text-sm">Deductions</span>
                                            <span className="font-semibold">-${selectedTeacher.deductions}</span>
                                        </div>
                                        <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center font-bold text-xl text-slate-900">
                                            <span>Total Payable</span>
                                            <span className="text-blue-600">${selectedTeacher.baseSalary + selectedTeacher.bonus - selectedTeacher.deductions}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 text-center">This action will mark the salary as "Paid" for the current month.</p>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors">Cancel</button>
                                    <button onClick={confirmPayment} className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-sm transition-all active:scale-95">Confirm Payment</button>
                                </div>
                            </>
                        )}

                        {editingSalary && (
                            <form onSubmit={updateSalaryDetails}>
                                <div className="p-6 border-b border-slate-100 bg-slate-50">
                                    <h3 className="text-lg font-bold text-slate-900">Edit Salary Details</h3>
                                    <p className="text-sm text-slate-500 mt-1">{editingSalary.name} • {editingSalary.employeeId}</p>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Salary</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                            <input
                                                name="baseSalary"
                                                type="number"
                                                defaultValue={editingSalary.baseSalary}
                                                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bonus</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-medium">+</span>
                                                <input
                                                    name="bonus"
                                                    type="number"
                                                    defaultValue={editingSalary.bonus}
                                                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deductions</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-medium">-</span>
                                                <input
                                                    name="deductions"
                                                    type="number"
                                                    defaultValue={editingSalary.deductions}
                                                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-rose-100 focus:border-rose-500 outline-none transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95">Update Salary</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryManagement;
