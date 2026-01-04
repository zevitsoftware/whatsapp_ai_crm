const { SubscriptionPackage, Transaction, User, sequelize } = require('../models');
const qrisService = require('../services/qris.service');
const dayjs = require('dayjs');

exports.listPackages = async (req, res) => {
  try {
    const packages = await SubscriptionPackage.findAll({
      where: { isActive: true },
      order: [['price', 'ASC']]
    });
    res.json(packages);
  } catch (error) {
    console.error('List Packages Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.choosePackage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    const pkg = await SubscriptionPackage.findByPk(packageId);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    // Create Transaction
    const transaction = await Transaction.create({
      userId,
      packageId,
      amount: pkg.price,
      status: 'PENDING'
    }, { transaction: t });

    // Create QRIS Invoice
    const qrResult = await qrisService.createInvoice({
      amount: pkg.price,
      externalId: transaction.id,
      customerName: req.user.name,
      customerEmail: req.user.email
    });

    await transaction.update({
      qrisUrl: qrResult.data.qris_url,
      externalId: qrResult.data.external_id
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      transactionId: transaction.id,
      qrisUrl: qrResult.data.qris_url,
      qrisImage: qrResult.data.qris_image,
      amount: pkg.price
    });

  } catch (error) {
    await t.rollback();
    console.error('Choose Package Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.handleCallback = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payload = req.body;

    const { external_id, status } = payload; // Assuming these fields from qris.online

    const transaction = await Transaction.findByPk(external_id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'PAID') return res.json({ message: 'Already processed' });

    if (status === 'SUCCESS' || status === 'PAID') {
      // 1. Update Transaction
      await transaction.update({
        status: 'PAID',
        paidAt: new Date()
      }, { transaction: t });

      // 2. Update User Subscription
      const user = await User.findByPk(transaction.userId);
      const pkg = transaction.package;

      const currentExpiry = user.subscriptionExpiresAt && dayjs(user.subscriptionExpiresAt).isAfter(dayjs())
        ? dayjs(user.subscriptionExpiresAt)
        : dayjs();

      const newExpiry = currentExpiry.add(pkg.durationDays, 'day').toDate();

      await user.update({
        subscriptionType: pkg.type,
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: newExpiry
      }, { transaction: t });
    } else {
      await transaction.update({ status: 'FAILED' }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true });

  } catch (error) {
    await t.rollback();
    console.error('Subscription Callback Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['subscriptionType', 'subscriptionStatus', 'subscriptionExpiresAt']
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
