import {
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayEventRequestContextWithAuthorizer,
  APIGatewayProxyEvent,
} from "aws-lambda";
import { components } from "../../method-management/models/schema";
import {
  userInfoHandler,
  updateMfaMethodHandler,
  Response,
} from "../../method-management/method-management";

type MfaMethod = components["schemas"]["MfaMethod"];

jest.mock("../../scenarios/scenarios", () => {
  return {
    getUserIdFromEvent: () => {
      return "abc";
    },
    getUserScenario: () => {
      return [
        {
          mfaIdentifier: 1,
          priorityIdentifier: "PRIMARY",
          mfaMethodType: "SMS",
          endPoint: "07123456789",
          methodVerified: true,
        },
      ];
    },
  };
});

describe("MFA Management API Mock", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "table_name";
  });
  test("Registered user with a single MFA of type SMS", async () => {
    const mockApiEvent: APIGatewayProxyEvent = {
      body: "client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=eyJhbGkpXVCJ9.ey5BPMzRJIn0.RmHvYkaw&grant_type=authorization_code&code=ccca4dec-6799-413c-ab45-896d050006b5&redirect_uri=https%3A%2F%2Fhome.dev.account.gov.uk%2Fauth%2Fcallback",
      headers: {
        Authorization:
          "eyJraWQiOiJCLVFNVXhkSk9KOHVia21BcmM0aTFTR21mWm5OTmxNLXZhOWgwSEowakNvIiwiYWxnIjoiRVMyNTYifQ.eyJzdWIiOiJ1cm46ZmRjOmdvdi51azoyMDIyOjM2MzYxYzY0LTE0NzEtNDllNC1iY2Y0LWRhOTg2MzJlNDc1MyIsImlzcyI6Imh0dHBzOi8vb2lkYy1zdHViLmhvbWUuZGV2LmFjY291bnQuZ292LnVrLyIsImF1ZCI6IlZjZXI3LWl6OUJOcmRWRkctSlZxSjRrMm12dyIsImV4cCI6MTcxNDQ5NDEwOSwiaWF0IjoxNzE0NDkwNTA5LCJzaWQiOiI2MzRjZGE1Ny0zNmQ0LTRjMTEtYTQ2NS0wMTcwNmU2MjNhZTAiLCJub25jZSI6InhQTWtTcFpSbkVrYUdvdXA5MGRCIiwidm90IjoiQ2wuQ20ifQ.bymos9XVETXlHFB53qVhqcalNxUVx5bPCzef1lazthRqkzB-hr7DcIkzd51LEfoBF0MIppLz0vxQajEjgAQMvg",
      },
    } as never;
    // Act
    const result: Response = await userInfoHandler(mockApiEvent);

    // Assert
    expect(result).toBeDefined();
    expect(result.statusCode).toEqual(200);
    expect(result.body).toBeDefined();
    const mfaMethod: MfaMethod[] = JSON.parse(result.body);
    expect(mfaMethod.length).toEqual(1);
    expect(mfaMethod[0].mfaIdentifier).toEqual(1);
    expect(mfaMethod[0].priorityIdentifier).toEqual("PRIMARY");
    expect(mfaMethod[0].mfaMethodType).toEqual("SMS");
    expect(mfaMethod[0].endPoint).toEqual("07123456789");
    expect(mfaMethod[0].methodVerified).toBe(true);
  });
});

describe("updateMfaMethodHandler", () => {
  const createFakeAPIGatewayProxyEvent = (
    body: unknown,
    mfaIdentifier: string,
  ): APIGatewayProxyEvent => {
    return {
      body: JSON.stringify(body),
      httpMethod: "PUT",
      path: `/mfa-methods/${mfaIdentifier}`,
      pathParameters: { mfaIdentifier },
      isBase64Encoded: false,
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext:
        {} as APIGatewayEventRequestContextWithAuthorizer<APIGatewayEventDefaultAuthorizerContext>,
      resource: "",
    };
  };

  test("should return 200 and the updated method when the request is valid", async () => {
    const requestBody = {
      email: "email@email.com",
      credential: "email",
      otp: "123456",
      mfaMethod: {
        mfaIdentifier: 1,
        priorityIdentifier: "PRIMARY",
        mfaMethodType: "SMS",
        endPoint: "07123456789",
        methodVerified: true,
      },
    };
    const fakeEvent = createFakeAPIGatewayProxyEvent(requestBody, "1");
    const response = await updateMfaMethodHandler(fakeEvent);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject(requestBody.mfaMethod);
  });
});
