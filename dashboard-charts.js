/**
 * Dashboard Charts Module
 * Uses Chart.js for data visualization
 */

const DashboardCharts = {
    charts: {},

    // Chart.js default configuration
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                titleFont: {
                    family: "'Plus Jakarta Sans', sans-serif",
                    size: 13,
                    weight: '600'
                },
                bodyFont: {
                    family: "'Plus Jakarta Sans', sans-serif",
                    size: 12
                },
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        }
    },

    // Color palette
    colors: {
        primary: '#0d9488',
        primaryLight: 'rgba(13, 148, 136, 0.1)',
        dm: '#6366f1',
        dmLight: 'rgba(99, 102, 241, 0.1)',
        htn: '#ef4444',
        htnLight: 'rgba(239, 68, 68, 0.1)',
        htnSecondary: '#f97316',
        good: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        gray: '#94a3b8',
        grayLight: 'rgba(148, 163, 184, 0.2)'
    },

    /**
     * Initialize all dashboard charts
     */
    init() {
        this.initHbA1cChart();
        this.initBPChart();
        this.initWeightChart();
        this.initHRChart();
    },

    /**
     * Main HbA1c trend chart
     */
    initHbA1cChart() {
        const ctx = document.getElementById('hba1c-chart');
        if (!ctx) return;

        // Sample data - will be replaced with real data
        const labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月'];
        const data = [8.2, 7.8, 7.5, 7.6, 7.3, 7.2, 7.1];

        this.charts.hba1c = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: data.map(v => v <= 7 ? this.colors.good : v <= 7.5 ? this.colors.warning : this.colors.dm),
                    borderRadius: 8,
                    borderSkipped: false,
                    barThickness: 32,
                    maxBarThickness: 40
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Plus Jakarta Sans', sans-serif",
                                size: 12,
                                weight: '500'
                            },
                            color: '#64748b'
                        }
                    },
                    y: {
                        min: 5,
                        max: 10,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            font: {
                                family: "'Plus Jakarta Sans', sans-serif",
                                size: 11
                            },
                            color: '#94a3b8',
                            callback: (value) => value + '%'
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    annotation: {
                        annotations: {
                            targetLine: {
                                type: 'line',
                                yMin: 7,
                                yMax: 7,
                                borderColor: this.colors.danger,
                                borderWidth: 2,
                                borderDash: [6, 4],
                                label: {
                                    display: true,
                                    content: '目標 7%',
                                    position: 'end'
                                }
                            }
                        }
                    },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => `HbA1c: ${context.raw}%`
                        }
                    }
                }
            }
        });
    },

    /**
     * Mini BP trend chart
     */
    initBPChart() {
        const ctx = document.getElementById('bp-chart');
        if (!ctx) return;

        const labels = ['', '', '', '', '', '', ''];
        const systolic = [142, 138, 145, 140, 136, 138, 135];
        const diastolic = [88, 85, 90, 86, 84, 85, 82];

        this.charts.bp = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: systolic,
                        borderColor: this.colors.htn,
                        backgroundColor: this.colors.htnLight,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        data: diastolic,
                        borderColor: this.colors.htnSecondary,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: { display: false },
                    y: { display: false, min: 60, max: 160 }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    },

    /**
     * Mini weight trend chart
     */
    initWeightChart() {
        const ctx = document.getElementById('weight-chart');
        if (!ctx) return;

        const labels = ['', '', '', '', '', '', ''];
        const data = [78, 77.5, 77.8, 77.2, 76.8, 76.5, 76.2];

        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primaryLight,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    },

    /**
     * Mini heart rate trend chart
     */
    initHRChart() {
        const ctx = document.getElementById('hr-chart');
        if (!ctx) return;

        const labels = ['', '', '', '', '', '', ''];
        const data = [72, 75, 70, 74, 71, 73, 72];

        this.charts.hr = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: this.colors.good,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: { display: false },
                    y: { display: false, min: 50, max: 100 }
                }
            }
        });
    },

    /**
     * Update HbA1c chart with real data
     * @param {Array} observations - Array of HbA1c observations
     */
    updateHbA1cChart(observations) {
        if (!this.charts.hba1c || !observations || observations.length === 0) return;

        const sorted = observations
            .filter(o => o.value != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        const labels = sorted.map(o => {
            const date = new Date(o.date);
            return `${date.getMonth() + 1}月`;
        });

        const data = sorted.map(o => o.value);

        this.charts.hba1c.data.labels = labels;
        this.charts.hba1c.data.datasets[0].data = data;
        this.charts.hba1c.data.datasets[0].backgroundColor = data.map(v =>
            v <= 7 ? this.colors.good : v <= 7.5 ? this.colors.warning : this.colors.dm
        );
        this.charts.hba1c.update();
    },

    /**
     * Update BP chart with real data
     * @param {Array} systolicObs - Array of systolic BP observations
     * @param {Array} diastolicObs - Array of diastolic BP observations
     */
    updateBPChart(systolicObs, diastolicObs) {
        if (!this.charts.bp) return;

        const sortedSys = (systolicObs || [])
            .filter(o => o.value != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        const sortedDia = (diastolicObs || [])
            .filter(o => o.value != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        if (sortedSys.length > 0) {
            this.charts.bp.data.datasets[0].data = sortedSys.map(o => o.value);
        }
        if (sortedDia.length > 0) {
            this.charts.bp.data.datasets[1].data = sortedDia.map(o => o.value);
        }

        this.charts.bp.update();

        // Update latest value display
        if (sortedSys.length > 0 && sortedDia.length > 0) {
            const latestSys = sortedSys[sortedSys.length - 1].value;
            const latestDia = sortedDia[sortedDia.length - 1].value;
            const el = document.getElementById('bp-latest');
            if (el) el.textContent = `${latestSys}/${latestDia}`;
        }
    },

    /**
     * Update weight chart with real data
     * @param {Array} observations - Array of weight observations
     */
    updateWeightChart(observations) {
        if (!this.charts.weight || !observations || observations.length === 0) return;

        const sorted = observations
            .filter(o => o.value != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        this.charts.weight.data.datasets[0].data = sorted.map(o => o.value);
        this.charts.weight.update();

        // Update latest value display
        if (sorted.length > 0) {
            const latest = sorted[sorted.length - 1].value;
            const el = document.getElementById('weight-latest');
            if (el) el.textContent = `${latest} kg`;
        }
    },

    /**
     * Update heart rate chart with real data
     * @param {Array} observations - Array of heart rate observations
     */
    updateHRChart(observations) {
        if (!this.charts.hr || !observations || observations.length === 0) return;

        const sorted = observations
            .filter(o => o.value != null)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        this.charts.hr.data.datasets[0].data = sorted.map(o => o.value);
        this.charts.hr.update();

        // Update latest value display
        if (sorted.length > 0) {
            const latest = sorted[sorted.length - 1].value;
            const el = document.getElementById('hr-latest');
            if (el) el.textContent = `${latest} bpm`;
        }
    },

    /**
     * Destroy all charts (for cleanup)
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    },

    /**
     * Create HbA1c history line chart for disease detail view
     * @param {string} canvasId - Canvas element ID
     * @param {Array} data - Array of {date, value} objects
     */
    createHbA1cHistoryChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !data || data.length === 0) return null;

        // Sort by date ascending
        const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sorted.map(d => this.formatDateLabel(d.date));
        const values = sorted.map(d => d.value);

        // Destroy existing chart if any
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'HbA1c (%)',
                    data: values,
                    borderColor: this.colors.dm,
                    backgroundColor: this.colors.dmLight,
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: values.map(v => v <= 7 ? this.colors.good : v <= 8 ? this.colors.warning : this.colors.danger),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (ctx) => `HbA1c: ${ctx.raw}%`
                        }
                    },
                    annotation: {
                        annotations: {
                            targetLine: {
                                type: 'line',
                                yMin: 7,
                                yMax: 7,
                                borderColor: this.colors.good,
                                borderWidth: 2,
                                borderDash: [6, 4],
                                label: {
                                    display: true,
                                    content: '目標 <7%',
                                    position: 'end',
                                    backgroundColor: this.colors.good,
                                    font: { size: 11, weight: '500' }
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#64748b'
                        }
                    },
                    y: {
                        min: Math.max(4, Math.min(...values) - 1),
                        max: Math.min(14, Math.max(...values) + 1),
                        grid: { color: 'rgba(148, 163, 184, 0.15)' },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#94a3b8',
                            callback: (v) => v + '%'
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    },

    /**
     * Create Blood Pressure history line chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} data - Array of {date, systolic, diastolic} objects
     */
    createBPHistoryChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !data || data.length === 0) return null;

        const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sorted.map(d => this.formatDateLabel(d.date));
        const systolicValues = sorted.map(d => d.systolic);
        const diastolicValues = sorted.map(d => d.diastolic);

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '收縮壓',
                        data: systolicValues,
                        borderColor: this.colors.htn,
                        backgroundColor: this.colors.htnLight,
                        borderWidth: 2.5,
                        tension: 0.3,
                        fill: false,
                        pointBackgroundColor: this.colors.htn,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: '舒張壓',
                        data: diastolicValues,
                        borderColor: this.colors.htnSecondary,
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        tension: 0.3,
                        fill: false,
                        pointBackgroundColor: this.colors.htnSecondary,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
                        }
                    },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} mmHg`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#64748b'
                        }
                    },
                    y: {
                        min: 50,
                        max: 180,
                        grid: { color: 'rgba(148, 163, 184, 0.15)' },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#94a3b8',
                            callback: (v) => v + ' mmHg'
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    },

    /**
     * Create eGFR history line chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} data - Array of {date, egfr, creatinine} objects
     */
    createKidneyHistoryChart(canvasId, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx || !data || data.length === 0) return null;

        const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sorted.map(d => this.formatDateLabel(d.date));
        const egfrValues = sorted.map(d => d.egfr).filter(v => v != null);

        if (egfrValues.length === 0) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // Color based on CKD stage
        const getEgfrColor = (v) => {
            if (v >= 90) return this.colors.good;
            if (v >= 60) return this.colors.warning;
            return this.colors.danger;
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'eGFR',
                    data: sorted.map(d => d.egfr),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2.5,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: sorted.map(d => getEgfrColor(d.egfr)),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: { display: false },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (ctx) => `eGFR: ${ctx.raw} mL/min/1.73m²`
                        }
                    },
                    annotation: {
                        annotations: {
                            stage2Line: {
                                type: 'line',
                                yMin: 60,
                                yMax: 60,
                                borderColor: this.colors.warning,
                                borderWidth: 1.5,
                                borderDash: [4, 4],
                                label: {
                                    display: true,
                                    content: 'G2',
                                    position: 'start',
                                    backgroundColor: this.colors.warning,
                                    font: { size: 10 }
                                }
                            },
                            stage3Line: {
                                type: 'line',
                                yMin: 30,
                                yMax: 30,
                                borderColor: this.colors.danger,
                                borderWidth: 1.5,
                                borderDash: [4, 4],
                                label: {
                                    display: true,
                                    content: 'G3b',
                                    position: 'start',
                                    backgroundColor: this.colors.danger,
                                    font: { size: 10 }
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#64748b'
                        }
                    },
                    y: {
                        min: 0,
                        max: Math.max(120, ...egfrValues) + 10,
                        grid: { color: 'rgba(148, 163, 184, 0.15)' },
                        ticks: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });

        return this.charts[canvasId];
    },

    /**
     * Format date for chart labels
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDateLabel(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        // Show year/month format for better readability
        return `${year}/${month}`;
    }
};

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Chart.js is loaded
    setTimeout(() => {
        DashboardCharts.init();
    }, 100);
});

// Make available globally
window.DashboardCharts = DashboardCharts;
