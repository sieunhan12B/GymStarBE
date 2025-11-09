import _sequelize from "sequelize";
const { Model, DataTypes } = _sequelize;

export default class carts extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        cart_id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false, // Không cho null nữa
          unique: true, // THÊM DÒNG NÀY → UNIQUE!
          references: {
            model: "users",
            key: "user_id",
          },
        },
        product_variant_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: "product_variants",
            key: "product_variant_id",
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 1,
        },
      },
      {
        sequelize,
        tableName: "carts",
        schema: "public",
        timestamps: true,
        indexes: [
          {
            name: "carts_pkey",
            unique: true,
            fields: [{ name: "cart_id" }],
          },
          {
            name: "carts_user_id_unique", // Tên index
            unique: true,
            fields: [{ name: "user_id" }], // Tạo unique index cho user_id
          },
        ],
      }
    );
  }
}
