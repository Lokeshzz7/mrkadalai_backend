

import prisma from "../../prisma/client.js";
//Expense Management
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