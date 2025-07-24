import prisma from "../../prisma/client.js";


//Outlets management
export const addOutlets = async (req, res, next) => {
  const { name, address, phone, email,staffCount} = req.body;

  try {
    if (!name || !address || !email || !phone) {
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
