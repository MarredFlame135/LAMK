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
  query getProducts($first: Int = 20, $query: String, $after: String) {
    products(first: $first, query: $query, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        cursor
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

// --- Autenticación de clientes (HU-01 / RF-02) ---
// Flujo clásico de la Storefront API: customerCreate + customerAccessTokenCreate.
// No requiere Shopify Plus ni configurar OAuth, funciona en cualquier plan.

export const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_RECOVER_MUTATION = `
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_ACCESS_TOKEN_DELETE_MUTATION = `
  mutation customerAccessTokenDelete($customerAccessToken: String!) {
    customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
      deletedAccessToken
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_CUSTOMER_QUERY = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      numberOfOrders
      orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name
            processedAt
            currentTotalPrice {
              amount
              currencyCode
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;