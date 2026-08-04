// src/lib/shopify/queries.ts

// Fragmento reutilizable de variante de producto (tallas, precio, stock)
export const VARIANT_FRAGMENT = `
  fragment VariantFields on ProductVariant {
    id
    title
    sku
    availableForSale
    quantityAvailable
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
  }
`;

// Consulta para obtener catálogo de productos con Metafields personalizados
export const GET_PRODUCTS_QUERY = `
  ${VARIANT_FRAGMENT}
  query getProducts($first: Int = 20, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          vendor
          productType
          description
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 25) {
            edges {
              node {
                ...VariantFields
              }
            }
          }
          storytelling: metafield(namespace: "custom", key: "storytelling") {
            value
          }
          fitAdvisor: metafield(namespace: "custom", key: "fit_advisor") {
            value
          }
          hypeViews: metafield(namespace: "custom", key: "hype_views") {
            value
          }
        }
      }
    }
  }
`;

// Consulta para detalle de un producto específico por su 'handle' (URL)
export const GET_PRODUCT_BY_HANDLE_QUERY = `
  ${VARIANT_FRAGMENT}
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      vendor
      productType
      descriptionHtml
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 30) {
        edges {
          node {
            ...VariantFields
          }
        }
      }
      storytelling: metafield(namespace: "custom", key: "storytelling") {
        value
      }
      fitAdvisor: metafield(namespace: "custom", key: "fit_advisor") {
        value
      }
    }
  }
`;