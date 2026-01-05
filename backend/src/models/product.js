const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    discount: { // Discount Value (e.g. 50000 or 10%) - Let's handle logical formatting in code
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    promoEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    vectorId: { // Link to VectorDB ID for easy deletion/update
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true
  });

  return Product;
};
