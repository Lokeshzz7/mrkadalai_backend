import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';

//Outlets management
export const addOutlets = async (req, res, next) => {
  const { name, address, phone, email,staffCount} = req.body;

  try {
    if (!name || !address || !email || !phone ||!staffCount) {
      return res.status(400).json({ message: "Provide all outlet details" });
    }

    const intStaffCount = parseInt(staffCount);

    const existingOutlet = await prisma.outlet.findUnique({
      where: { email }
    });

    if (existingOutlet) {
      return res.status(400).json({ message: "Outlet already exists" });
    }

    const outlet = await prisma.outlet.create({
      data: {
        name,
        address,
        phone,
        email,
        staffCount : intStaffCount
      }
    });

    res.status(201).json({ message: "Outlet created successfully", outlet });
  } catch (error) {
    console.error("Error creating outlet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export const removeOutlets = async(req,res,next)=>{
  const outletId = parseInt(req.params.outletId);
  if(!outletId) return res.status(400).json({message:"Provide OutletId to delete"});
  try{
    const deleted = await prisma.outlet.delete({where:{id:outletId}}); 
    res.status(200).json({message:"Deleted Outlet"});
  }
  catch(err){
    console.error(err);
    res.status(400).json({message:"Internal Server Error"});
  }
}
export const getOutlets = async (req, res, next) => {
  try {
    const outlets = await prisma.outlet.findMany();
    res.json({ outlets });
  } catch (error) {
    console.error("Error fetching outlets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

//Order management
export const outletTotalOrders = async (req, res, next) => {
  const { outletId } = req.params;

  try {
    const orders = await prisma.order.findMany({
      where: { outletId: Number(outletId) },
      include: {
        customer: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true
              }
            },
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = orders.map(order => ({
      orderId: order.id,
      orderTime: order.createdAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      customerName: order.customer?.user?.email || 'N/A',
      customerPhone: order.customer?.phone || 'N/A',
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity
      }))
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
}

//Staff management
export const outletAddStaff = async (req, res, next) => {
  try {
    const { email, password, name , phone, outletId, staffRole, permissions = [] } = req.body;


    if (!email || !password || !name || !phone || !staffRole || !outletId || !staffRole){
      return res.status(400).json({ message: "Please provide email, password, fullName, and phone." });
    }


    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        outletId,
        role: 'STAFF',
        staffInfo: {
          create: {
            staffRole
          }
        }
      },
      include: {
        staffInfo: true,
      }
    });


    if (permissions.length > 0) {
      const permissionCreates = permissions.map(type => ({
        staffId: newUser.staffInfo.id,
        type,
        isGranted: true,
      }));

      await prisma.staffPermission.createMany({
        data: permissionCreates,
      });
    }

    return res.status(201).json({ message: "Staff user created successfully", user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  }
  catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const outletStaffPermission = async (req, res, next) => {
  const { permission, grant, staffId } = req.body;

  if (!staffId || !permission || typeof grant !== 'boolean') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const existing = await prisma.staffPermission.findFirst({
      where: {
        staffId,
        type: permission,
      }
    });

    if (existing) {

      const updated = await prisma.staffPermission.update({
        where: { id: existing.id },
        data: { isGranted: grant }
      });
      return res.json({ message: `Permission ${grant ? 'granted' : 'revoked'}`, permission: updated });
    } else {

      const created = await prisma.staffPermission.create({
        data: {
          staffId,
          type: permission,
          isGranted: grant,
        }
      });
      return res.json({ message: `Permission ${grant ? 'granted' : 'revoked'}`, permission: created });
    }
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getOutletStaff = async (req, res, next) => {
  const outletId = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: 'Invalid outlet ID' });
  }

  try {
    const staffs = await prisma.staffDetails.findMany({
      where: {
        user: {
          outletId: outletId,
          role: 'STAFF'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            outletId: true
          }
        },
        permissions: true
      }
    });

    res.status(200).json({ staffs });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

//Product management

export const getProducts = async (req, res, next) => {
  try {
    const outletId = parseInt(req.params.outletId); 

    const products = await prisma.product.findMany({
      where: outletId ? { outletId } : {},
      include: {
        inventory: true,   
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({message:"Internal Server Error"});
    
  }
};

export const addProduct = async(req,res,next) =>{
  try{
    const {name,description,price,imageUrl,outletId,category,threshold} = req.body;

    if(!name || !description || !price || !outletId || !category){
      return res.status(400).json({ message: 'Provide all the fields' });
    }
    const crtName = name.toLowerCase();

    const existingProduct = await prisma.product.findUnique({where:{name:crtName}});

    if(existingProduct){
      return res.status(400).json({message:"Product already available"});
    }

    const newProduct = await prisma.product.create({
      data:{
        name:crtName,
        description,
        price,
        imageUrl,
        outletId,
        category,
        inventory:{
          create:{
            outletId,
            threshold:parseInt(threshold),
            quantity:0,
          }
        }
      }
    });
    return res.status(201).json({
      message : "Product Created",product : {
        "name" : newProduct.name,
        "price" : newProduct.price
      }
    });
  }  
  catch(err){
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const deleteProduct = async(req,res,next)=>{
    const id = parseInt(req.params.id);
    if(!id) return res.status(400).json({message:"Provide productID"});
    try{
      const products = await prisma.product.deleteMany({
        where:{id}
      });
      if (products.count === 0) {
      return res.status(404).json({ message: 'No product found with that id' });
    }

    res.status(200).json({ message: `${products.count} product(s) deleted successfully` });
    }
    catch(err){
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Internal server error' });
    }
}

//Inventory management
export const getStocks = async (req, res, next) => {
  const outletId = parseInt(req.params.outletId);
  if (!outletId) return res.status(400).json({ message: "Provide outletId" })
  try {
    const products = await prisma.product.findMany({
      where: { outletId },
      include: {
        inventory: true
      }
    });

    if (!products || products.length === 0) {
      return res.status(200).json({ message: "No products found for this outlet." });
    }

    const stockInfo = products.map(prod => ({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      quantity: prod.inventory?.quantity ?? 0,
      threshold: prod.inventory?.threshold ?? 0
    }));

    return res.status(200).json({ stocks: stockInfo });
  } catch (err) {
    console.error("Error fetching stocks:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addStock = async (req, res,next) => {
  const { productId, outletId, addedQuantity } = req.body;

  if (!productId || !outletId || !addedQuantity) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  try {
    const inventory = await prisma.inventory.findUnique({ where: { productId } });

    if (!inventory) {
      return res.status(404).json({ message: "Product inventory not found" });
    }

  
    const updatedInventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: { increment: addedQuantity }
      }
    });

    await prisma.stockHistory.create({
      data: {
        productId,
        outletId,
        quantity: addedQuantity,
        action: "ADD",
      }
    });

    return res.status(200).json({ message: "Stock updated successfully", updatedInventory });
  } catch (err) {
    console.error("Error updating stock:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deductStock = async (req, res, next) => {
  const { productId, outletId, quantity } = req.body;

  if (!productId || !outletId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "Provide valid productId, outletId, and quantity." });
  }

  try {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: parseInt(productId),
        outletId: parseInt(outletId),
      }
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found." });
    }

    if (inventory.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock available." });
    }

    const updatedInventory = await prisma.inventory.update({
      where: { productId: parseInt(productId) },
      data: {
        quantity: {
          decrement: quantity
        }
      }
    });

    await prisma.stockHistory.create({
      data: {
        productId: parseInt(productId),
        outletId,
        quantity,
        action: "REMOVE",
      }
    });

    res.status(200).json({ message: "Stock deducted successfully", currentQuantity: updatedInventory.quantity });

  } catch (err) {
    console.error("Error deducting stock:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const stockHistory = async (req, res, next) => {
  const { outletId, startDate, endDate } = req.body;

  if (!outletId || !startDate || !endDate) {
    return res.status(400).json({ message: "outletId, startDate, and endDate are required." });
  }

  try {
    const parsedOutletId = parseInt(outletId);
    const from = new Date(startDate);
    const to = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    const history = await prisma.stockHistory.findMany({
      where: {
        outletId: parsedOutletId,
        action: "ADD",
        timestamp: {
          gte: from,
          lte: to
        }
      },
      orderBy: {
        timestamp: "desc"
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({ message: "Stock history fetched", history });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addExpense = async (req, res, next) => {
  const { outletId, description, category, amount, method, paidTo, expenseDate} = req.body;

  try {
    if (!outletId || !description || !category || !amount || !method || !paidTo || !expenseDate) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const validMethods = ['UPI', 'CARD', 'CASH', 'WALLET'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const parsedDate = new Date(expenseDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid expenseDate: Must be a valid date' });
    }

    const expense = await prisma.expense.create({
      data: {
        outletId: Number(outletId),
        description,
        category,
        amount,
        method,
        paidTo,
        expenseDate: parsedDate,
      },
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: {
        id: expense.id,
        outletId: expense.outletId,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        method: expense.method,
        paidTo: expense.paidTo,
        expenseDate: expense.expenseDate,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getExpenses = async (req, res, next) => {
  const { outletId } = req.params;

  try {
    const outletIdNum = Number(outletId);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Fetch expenses
    const expenses = await prisma.expense.findMany({
      where: {
        outletId: outletIdNum,
        expenseDate: {
          gte: twoWeeksAgo,
          lte: new Date(), 
        },
      },
      orderBy: {
        expenseDate: 'desc',
      },
    });

    
    const formattedExpenses = expenses.map(expense => ({
      id: expense.id,
      outletId: expense.outletId,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      method: expense.method,
      paidTo: expense.paidTo,
      expenseDate: expense.expenseDate,
      createdAt: expense.createdAt,
    }));

    res.status(200).json({
      message: expenses.length > 0 ? 'Expenses retrieved successfully' : 'No expenses found for the last 2 weeks',
      expenses: formattedExpenses,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getExpenseByDate = async (req, res, next) => {
  const { outletId, from, to } = req.body;

  if (!outletId || !from || !to) {
    return res.status(400).json({ message: "Provide all the details" });
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        outletId: parseInt(outletId),
        expenseDate: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    return res.status(200).json({
      message: "Expenses fetched successfully",
      count: expenses.length,
      expenses
    });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getCustomersWithWallet = async (req, res, next) => {
  const outletId  = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: "Provide outletId" });
  }

  try {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        outletId: parseInt(outletId)
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        customerInfo: {
          select: {
            id: true, 
            wallet: {
              select: {
                id: true,             
                balance: true,
                totalRecharged: true,
                totalUsed: true,
                lastRecharged: true,
                lastOrder: true
              }
            }
          }
        }
      }
    });

    const formatted = customers.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      customerId: user.customerInfo?.id,
      walletId: user.customerInfo?.wallet?.id,
      balance: user.customerInfo?.wallet?.balance || 0,
      totalRecharged: user.customerInfo?.wallet?.totalRecharged || 0,
      totalUsed: user.customerInfo?.wallet?.totalUsed || 0,
      lastRecharged: user.customerInfo?.wallet?.lastRecharged,
      lastOrder: user.customerInfo?.wallet?.lastOrder
    }));

    return res.status(200).json({
      message: "Customers with wallet fetched successfully",
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error("Error fetching customers with wallet:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRechargeHistoryByOutlet = async (req, res, next) => {
  const outletId  = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: "Provide outletId" });
  }

  try {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        outletId: parseInt(outletId)
      },
      select: {
        name: true,
        customerInfo: {
          select: {
            wallet: {
              select: {
                transactions: {
                  orderBy: {
                    createdAt: 'desc'
                  },
                  select: {
                    id: true,
                    amount: true,
                    createdAt: true,
                    method: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const history = [];

    customers.forEach(customer => {
      const customerName = customer.name;
      const transactions = customer.customerInfo?.wallet?.transactions || [];

      transactions.forEach(txn => {
        history.push({
          customerName,
          rechargeId: txn.id,
          amount: txn.amount,
          date: txn.createdAt,
          method: txn.method,
          status: txn.status
        });
      });
    });

    return res.status(200).json({
      message: "Recharge history fetched successfully",
      count: history.length,
      data: history
    });
  } catch (err) {
    console.error("Error fetching recharge history:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrdersPaidViaWallet = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'WALLET'  
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        paymentMethod: true,
        customer: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const result = orders.map(order => ({
      orderId: order.id,
      customerName: order.customer?.user?.name || "Unknown",
      orderTotal: order.totalAmount,
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod
    }));

    return res.status(200).json({
      message: "Orders paid via wallet fetched successfully",
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error fetching wallet orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getOutletCustomers = async (req, res, next) => {
  const { outletId } = req.params;

  try {
    const outletIdNum = Number(outletId);

    const customers = await prisma.user.findMany({
      where: {
        outletId: outletIdNum,
        role: 'CUSTOMER',
      },
      include: {
        customerInfo: {
          include: {
            wallet: true,
            orders: {
              select: {
                totalAmount: true,
              },
            },
          },
        },
      },
    });

    const formattedCustomers = customers.map(user => ({
      customerId: user.customerInfo?.id || null,
      walletId: user.customerInfo?.wallet?.id || null,
      name: user.name,
      yearOfStudy: user.customerInfo?.yearOfStudy || null,
      phoneNo: user.phone || null,
      walletBalance: user.customerInfo?.wallet?.balance || 0,
      totalPurchaseCost: user.customerInfo?.orders.reduce((sum, order) => sum + order.totalAmount, 0) || 0,
    }));

    res.status(200).json({
      message: customers.length > 0 ? 'Customers retrieved successfully' : 'No customers found for this outlet',
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
