const { pick } = require('lodash');

const { STATUS_OK } = require('@constants/Response');
const BaseController = require('./BaseController');


class ProductsController extends BaseController {
  async index(req, res) {
    let data;
    try {
      let defaultParams = {
        fields: [
          'id',
          'status',
          'title_translations',
          'same_price',
          'price',
          'price_sale',
          'lowest_price',
          'quantity',
          'unlimited_quantity',
          'variant_options',
          'variations.id',
          'variations.fields_translations',
          'variations.price',
          'variations.price_sale',
          'variations.quantity',
          'variations.unlimited_quantity',
          'variations.media.images.thumb',
          'variations.media.images.original',
          'variations.sku',
          'variations.variant_option_ids',
          'medias.images.thumb',
          'medias.images.original',
        ]
          .map((k) => `items.${k}`)
          .concat(['pagination']),
      };
      const { page, categoryId, name } = this.params(req);
      defaultParams = {
        ...defaultParams,
        page: page || 1,
        per_page: 24,
      };

      const useSearch = categoryId || name;
      if (useSearch) {
        const params = {
          ...defaultParams,
        };
        if (categoryId) {
          params.category_id = categoryId;
        }
        if (name) {
          params.title_translations = name;
        }
        data = await OpenApiClient.request({
          url: 'products/search',
          params,
          accessToken: res.locals.accessToken,
        });
      } else {
        data = await OpenApiClient.request({
          url: 'products',
          params: defaultParams,
          accessToken: res.locals.accessToken,
        });
      }
      return helpers.renderJson(res, new helpers.JsonResponse(data, STATUS_OK));
    } catch (ex) {
      return this.renderError(ex, res, 'index', 'Unable to get products');
    }
  }

  async updateSaleEventProducts(req, res) {
    try {
      const host = await this.constructor.getHost(req.params.merchantId);
      const saleEvent = await this.constructor.getSaleEvent({
        saleEventId: req.params.saleEventId,
        merchantId: req.params.merchantId,
      });

      const products = await Product.findByQueryObj({
        saleEvent, deletedAt: null,
      });

      if (!saleEvent) {
        throw new Errors_UnprocessableEntityError('Unable to find saleEvent', { code: 'SALE_EVENT_NOT_FOUND' });
      }

      const productsPayload = ProductService.prepareProductsPayload(
        req.body.products, products, host._id, saleEvent._id,
      );

      const upsertedProducts = await Product.upsertMany(productsPayload);
      const result = {
        items: upsertedProducts.map((e) => e.toAdminObject()),
      };
      return helpers.renderJson(res, new helpers.JsonResponse(result, STATUS_OK));
    } catch (ex) {
      return this.renderError(ex, res, 'updateSaleEventProducts', 'Unable to update products');
    }
  }

  async getSaleEventProducts(req, res) {
    try {
      const whiteList = ['saleEvent', 'host', 'deletedAt'];
      const isPublicAccess = (req.path || '').indexOf('/merchants') < 0;
      const saleEvent = await this.constructor.getSaleEvent({
        saleEventId: req.params.saleEventId,
        merchantId: isPublicAccess ? null : req.params.merchantId,
      });
      if (!saleEvent) {
        throw new Errors_NotFoundError('Unable to find saleEvent', { code: 'SALE_EVENT_NOT_FOUND' });
      }
      const {
        queryObj, page, offset, limit,
      } = helpers.getQueryObj(
        { ...req.query, saleEvent: saleEvent._id, deletedAt: null },
        whiteList,
      );
      if (isPublicAccess !== true) {
        queryObj.host = saleEvent.host;
      } else {
        queryObj.status = { $in: ['active', 'hidden'] };
      }
      const [products, total] = await Promise.all([
        Product.findByQueryObj({ ...queryObj }, offset, limit),
        Product.countByQueryObj(queryObj),
      ]);
      const result = {
        items: products.map((p) => (isPublicAccess ? p.toPublicObject() : p.toAdminObject())),
        page,
        offset,
        limit,
        total,
      };
      return helpers.renderJson(res, new helpers.JsonResponse(result, STATUS_OK));
    } catch (e) {
      return this.renderError(e, res, 'products', 'Unable to get products of sale event');
    }
  }

  async removeSaleEventProducts(req, res) {
    try {
      const host = await this.constructor.getHost(req.params.merchantId);
      const saleEvent = await this.constructor.getSaleEvent({
        saleEventId: req.params.saleEventId,
        merchantId: req.params.merchantId,
      });

      if (!saleEvent) {
        throw new Errors_NotFoundError('Unable to find saleEvent', { code: 'SALE_EVENT_NOT_FOUND' });
      }

      await Promise.map(req.body.products, async (product) => {
        const criteria = pick(
          {
            ...product,
            host: host._id,
            saleEvent: saleEvent._id,
          },
          ['saleEvent', 'host', 'productId', 'variationId'],
        );
        return Product.updateMany(criteria, { deletedAt: Date.now() });
      });

      return helpers.renderJson(res, new helpers.JsonResponse({}, STATUS_OK));
    } catch (e) {
      return this.renderError(e, res, 'products', 'Unable to delete products of sale event');
    }
  }
}

module.exports = ProductsController;
