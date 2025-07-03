import prisma from "../../prisma/client.js";

export const createTicket = async (req, res, next) => {
  const { title, description, priority, issueType } = req.body;
  const userId = req.user.id; 

  if (!title || !description || !priority) {
    return res.status(400).json({ message: "Please provide title, description, and priority" });
  }

  try {
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerInfo: true
      }
    });

    if (!customer || !customer.customerInfo) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const ticket = await prisma.ticket.create({
      data: {
        customerId: customer.customerInfo.id,
        title,
        description,
        priority: priority.toUpperCase(),
        status: "OPEN"
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: "Ticket created successfully",
      ticket: {
        id: ticket.id,
        ticketNumber: `TKT-${new Date().getFullYear()}-${String(ticket.id).padStart(3, '0')}`,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        issueType: issueType || "General"
      }
    });

  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCustomerTickets = async (req, res, next) => {
  const userId = req.user.id; 

  try {
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerInfo: true
      }
    });

    if (!customer || !customer.customerInfo) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const tickets = await prisma.ticket.findMany({
      where: {
        customerId: customer.customerInfo.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    const formattedTickets = tickets.map(ticket => {
      const progressPercentage = ticket.status === 'OPEN' ? 
        (ticket.resolutionNote ? 80 : 30) : 100;
      
      const progress = ticket.status === 'OPEN' ? 
        (ticket.resolutionNote ? 'Waiting for Response' : 'In Progress') : 
        'Resolved';

      return {
        id: ticket.id.toString(),
        ticketNumber: `TKT-${new Date(ticket.createdAt).getFullYear()}-${String(ticket.id).padStart(3, '0')}`,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status.toLowerCase(),
        progress,
        progressPercentage,
        dateIssued: ticket.createdAt.toISOString().split('T')[0],
        resolvedDate: ticket.resolvedAt ? ticket.resolvedAt.toISOString().split('T')[0] : null,
        resolutionNote: ticket.resolutionNote,
        issueType: ticket.title.includes('Payment') ? 'Payment Problems' : 
                   ticket.title.includes('Order') ? 'Order Issues' : 
                   ticket.title.includes('Account') ? 'Account Issues' : 
                   ticket.title.includes('Technical') ? 'Technical Support' : 'Others'
      };
    });

    const ongoing = formattedTickets.filter(ticket => ticket.status === 'open');
    const completed = formattedTickets.filter(ticket => ticket.status === 'closed');

    res.status(200).json({
      tickets: {
        ongoing,
        completed
      }
    });

  } catch (err) {
    console.error("Error fetching customer tickets:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTicketDetails = async (req, res, next) => {
  const { ticketId } = req.params;
  const userId = req.user.id;
  const intTicketId = parseInt(ticketId);

  if (!intTicketId) {
    return res.status(400).json({ message: "Provide valid ticket ID" });
  }

  try {
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerInfo: true
      }
    });

    if (!customer || !customer.customerInfo) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: intTicketId,
        customerId: customer.customerInfo.id 
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const formattedTicket = {
      id: ticket.id.toString(),
      ticketNumber: `TKT-${new Date(ticket.createdAt).getFullYear()}-${String(ticket.id).padStart(3, '0')}`,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status.toLowerCase(),
      progress: ticket.status === 'OPEN' ? 
        (ticket.resolutionNote ? 'Waiting for Response' : 'In Progress') : 
        'Resolved',
      progressPercentage: ticket.status === 'OPEN' ? 
        (ticket.resolutionNote ? 80 : 30) : 100,
      dateIssued: ticket.createdAt.toISOString().split('T')[0],
      resolvedDate: ticket.resolvedAt ? ticket.resolvedAt.toISOString().split('T')[0] : null,
      resolutionNote: ticket.resolutionNote,
      issueType: ticket.title.includes('Payment') ? 'Payment Problems' : 
                 ticket.title.includes('Order') ? 'Order Issues' : 
                 ticket.title.includes('Account') ? 'Account Issues' : 
                 ticket.title.includes('Technical') ? 'Technical Support' : 'Others'
    };

    res.status(200).json({
      ticket: formattedTicket
    });

  } catch (err) {
    console.error("Error fetching ticket details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};