
import prisma from "../../prisma/client.js";
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