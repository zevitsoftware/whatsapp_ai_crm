const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VectorArchive = sequelize.define('VectorArchive', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fileId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chunkIndex: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    embedding: {
      type: DataTypes.JSON, // Vector stored as JSON array
      allowNull: false
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'vector_archives',
    indexes: [
      { fields: ['userId'] },
      { fields: ['fileId'] },
      { fields: ['userId', 'createdAt'] }
    ]
  });

  VectorArchive.associate = (models) => {
    VectorArchive.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    VectorArchive.belongsTo(models.KnowledgeBase, {
      foreignKey: 'fileId',
      as: 'file'
    });
  };

  return VectorArchive;
};
