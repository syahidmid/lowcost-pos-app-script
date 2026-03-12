// ============================================================
// AnalyticsService.gs — Reporting & analytics queries
// ============================================================

const AnalyticsService = (() => {

  function getTodaySummary() {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end   = new Date(today); end.setHours(23, 59, 59, 999);
    return getSummaryByRange(start.toISOString(), end.toISOString());
  }

  function getSummaryByRange(startDate, endDate) {
    const orders = OrderService.getOrdersByDateRange(startDate, endDate)
      .filter(o => o.status !== CONFIG.ORDER_STATUS.CANCELLED);

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders  = orders.length;

    // Items sold
    let totalItems = 0;
    const categoryBreakdown = {};
    const itemBreakdown = {};

    orders.forEach(order => {
      const items = OrderService.getItemsByOrderId(order.orderId);
      items.forEach(item => {
        totalItems += item.qty;

        // by category — need to look up menu
        const menuItem = MenuService.getById(item.menuId);
        const cat = menuItem ? menuItem.category : 'Unknown';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + item.subtotal;

        // by item name
        if (!itemBreakdown[item.menuName]) {
          itemBreakdown[item.menuName] = { qty: 0, revenue: 0 };
        }
        itemBreakdown[item.menuName].qty     += item.qty;
        itemBreakdown[item.menuName].revenue += item.subtotal;
      });
    });

    const topItems = Object.entries(itemBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const paymentBreakdown = {};
    orders.forEach(o => {
      paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] || 0) + o.totalAmount;
    });

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      categoryBreakdown,
      topItems,
      paymentBreakdown,
    };
  }

  function getTransactionList(startDate, endDate) {
    const orders = OrderService.getOrdersByDateRange(startDate, endDate);
    return orders
      .map(o => {
        const items = OrderService.getItemsByOrderId(o.orderId);
        return { ...o, items, itemCount: items.reduce((s, i) => s + i.qty, 0) };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getHourlyRevenue(date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    const orders = OrderService.getOrdersByDateRange(start.toISOString(), end.toISOString())
      .filter(o => o.status !== CONFIG.ORDER_STATUS.CANCELLED);

    const hourly = Array(24).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hourly[h] += o.totalAmount;
    });
    return hourly;
  }

  return {
    getTodaySummary,
    getSummaryByRange,
    getTransactionList,
    getHourlyRevenue,
  };

})();
