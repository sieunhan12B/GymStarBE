import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class product_variants extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    product_variant_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'product_id'
      }
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    size: {
      type: DataTypes.ENUM("S","M","L","XL","XXL"),
      allowNull: true
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "product_variants_sku_key"
    }
  }, {
    sequelize,
    tableName: 'product_variants',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "product_variants_pkey",
        unique: true,
        fields: [
          { name: "product_variant_id" },
        ]
      },
      {
        name: "product_variants_sku_key",
        unique: true,
        fields: [
          { name: "sku" },
        ]
      },
    ]
  });
  }
}
