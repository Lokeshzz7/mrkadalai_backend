// services/orderCancellationScheduler.js
import cron from 'node-cron';
import prisma from '../prisma/client.js';
import { getCurrentISTAsUTC, convertUTCToIST } from '../utils/timezone.js';

class OrderCancellationScheduler {
  constructor() {
    this.initializeScheduler();
  }

  // Initialize the scheduler to run at 12:01 AM every day
  initializeScheduler() {
    try {
      console.log('Initializing order cancellation scheduler...');
      
      // Schedule to run at 12:01 AM every day (1 minute past midnight)
      // Cron format: minute hour day month dayOfWeek
      // 1 0 * * * means: at 1 minute past midnight every day
      cron.schedule('1 0 * * *', async () => {
        console.log('Running daily order cancellation job at 12:01 AM...');
        await this.cancelPendingOrders();
      }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // IST timezone
      });
      console.log('Order cancellation scheduler initialized - will run at 12:01 AM IST daily');
    } catch (error) {
      console.error('Error initializing order cancellation scheduler:', error);
    }
  }

  // Cancel all pending orders from previous days
  async cancelPendingOrders() {
    try {
      // Get current IST time as UTC for proper comparison
      const currentISTAsUTC = getCurrentISTAsUTC();
      const startOfTodayIST = new Date(currentISTAsUTC.getFullYear(), currentISTAsUTC.getMonth(), currentISTAsUTC.getDate());
      
      console.log(`Current IST time: ${convertUTCToIST(new Date()).toISOString()}`);
      console.log(`Checking for pending orders with delivery date before: ${startOfTodayIST.toISOString()}`);
      // Find all pending orders with delivery dates before today (IST)
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
          deliveryDate: {
            lt: startOfTodayIST // Less than start of today in IST (i.e., yesterday or earlier)
          }
        },
        include: {
          customer: {
            include: {
              user: true
            }
          },
          outlet: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
      if (pendingOrders.length === 0) {
        console.log('No pending orders found to cancel');
        return { cancelledCount: 0, orders: [] };
      }
      console.log(`Found ${pendingOrders.length} pending orders to cancel`);
      // Cancel each order
      const cancelledOrders = [];
      for (const order of pendingOrders) {
        try {
          // Update order status to CANCELLED
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED'
            }
          });
          cancelledOrders.push({
            orderId: order.id,
            customerId: order.customerId,
            customerName: order.customer?.user?.name || 'Unknown',
            outletName: order.outlet.name,
            totalAmount: order.totalAmount,
            deliveryDate: order.deliveryDate,
            paymentMethod: order.paymentMethod
          });
          console.log(`Cancelled order ${order.id} for customer ${order.customer?.user?.name || 'Unknown'}`);
        } catch (orderError) {
          console.error(`Error cancelling order ${order.id}:`, orderError);
        }
      }
      console.log(`Successfully cancelled ${cancelledOrders.length} orders`);
      
      return {
        cancelledCount: cancelledOrders.length,
        orders: cancelledOrders
      };
    } catch (error) {
      console.error('Error in cancelPendingOrders:', error);
      throw error;
    }
  }

  // Manual trigger for testing purposes
  async triggerCancellation() {
    console.log('Manually triggering order cancellation...');
    return await this.cancelPendingOrders();
  }

  // Get statistics about cancelled orders
  async getCancellationStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const stats = await prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate
          },
          status: 'CANCELLED'
        },
        _count: {
          status: true
        },
        _sum: {
          totalAmount: true
        }
      });
      return {
        period: `Last ${days} days`,
        cancelledOrders: stats.length > 0 ? stats[0]._count.status : 0,
        totalRefundAmount: stats.length > 0 ? stats[0]._sum.totalAmount : 0
      };
    } catch (error) {
      console.error('Error getting cancellation stats:', error);
      throw error;
    }
  }
}

export default new OrderCancellationScheduler();