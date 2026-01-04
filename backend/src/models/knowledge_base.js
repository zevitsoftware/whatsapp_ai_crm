const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KnowledgeBase = sequelize.define('KnowledgeBase', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PROCESSING', 'VECTORIZED', 'ERROR'),
      defaultValue: 'PROCESSING'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  });

  KnowledgeBase.associate = (models) => {
    KnowledgeBase.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return KnowledgeBase;
};
