"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const db_1 = require("../../lib/db");
const monitoring_1 = require("../../lib/monitoring");
async function DashboardPage() {
    const services = await db_1.prisma.service.findMany({
        take: 5
    });
    const statusData = await Promise.all(services.map(async (service) => {
        var _a, _b, _c;
        const uptime = await monitoring_1.monitoringService.calculateUptime(service.slug, 30);
        const recentChecks = await db_1.prisma.statusCheck.findMany({
            where: { serviceId: service.id },
            orderBy: { checkedAt: 'desc' },
            take: 1
        });
        return {
            ...service,
            uptime: uptime.toFixed(2),
            isUp: (_b = (_a = recentChecks[0]) === null || _a === void 0 ? void 0 : _a.isUp) !== null && _b !== void 0 ? _b : true,
            lastChecked: (_c = recentChecks[0]) === null || _c === void 0 ? void 0 : _c.checkedAt
        };
    }));
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold mb-8", children: "Service Status" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: statusData.map((service) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold", children: service.name }), (0, jsx_runtime_1.jsx)("div", { className: `w-3 h-3 rounded-full ${service.isUp ? 'bg-green-500' : 'bg-red-500'}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 text-sm text-gray-600 dark:text-gray-400", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "Status:" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: service.isUp ? 'Operational' : 'Down' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "30-day uptime:" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-medium", children: [service.uptime, "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { children: "Category:" }), (0, jsx_runtime_1.jsx)("span", { children: service.category })] })] })] }, service.id))) })] }) }));
}
