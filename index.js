const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const dynamoDBTableName = "products";

exports.handler = async (event) => {
    let body;
    let statusCode = '200';

    try {
        const bodyResponse = JSON.parse(event.body);

        const getProducts = async () => {
            const params = {
                TableName: dynamoDBTableName,
            };

            return await dynamo.scan(params).promise();
        };

        const createProduct = async () => {
            const params = {
                TableName: dynamoDBTableName,
                Item: {
                    name: bodyResponse.name
                }
            };

            if (!params.Item.name) {
                throw new Error("Name required");
            }

            const getRandomNumber = () => {
                let ts = new Date().getTime() - Math.random() * 512;
                return Math.floor((Math.random() * 512) + ts * 512);
            };

            params.Item.productId = getRandomNumber();

            const result = await dynamo.put(params).promise();

            if (!result) {
                throw new Error("something get wrong!");
            }
            statusCode = "201"
            return "Product added successful";
        };

        const updateProduct = async () => {
            const params = {
                TableName: dynamoDBTableName,
                Key: {
                    productId: bodyResponse.productId
                },
                UpdateExpression: "SET #name = :nm",
                ExpressionAttributeNames: {
                    '#name': 'name',
                },
                ExpressionAttributeValues: {
                    ':nm': bodyResponse.name,
                },
                ReturnValues: 'UPDATED_NEW'
            };

            if (!params.Key.productId) {
                throw new Error("productId required");
            }

            if (!bodyResponse.name) {
                throw new Error("name required");
            }

            return await dynamo.update(params).promise();
        };

        const removeProduct = async () => {
            const params = {
                TableName: dynamoDBTableName,
                Key: {
                    productId: JSON.parse(event.headers.id)
                },
                ReturnValues: "ALL_OLD"
            };

            if (!params.Key.productId) {
                throw new Error("productId required");
            }

            return await dynamo.delete(params).promise();
        };

        switch (event.httpMethod) {
            case 'GET':
                body = await getProducts();
                break;
            case 'POST':
                body = await createProduct(event);
                break;
            case 'PUT':
                body = await updateProduct(event);
                break;
            case 'DELETE':
                body = await removeProduct(event);
                break;
            default:
                throw new Error(`Unsupported method ${event.httpMethod}`);
        }

    } catch (error) {
        statusCode = '400';
        body = error.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        headers: {
            'Content-Type': 'application/json'
        },
        statusCode,
        body
    };
};
