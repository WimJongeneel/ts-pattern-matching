import "mocha";
import { expect } from "chai";
import { match } from "../src/main";

describe("Option Example", () => {
    it("should return value property", () => {
        type Option<a = any> = { kind: "none" } | { kind: "some"; value: a };
        const val: Option = { kind: "some", value: "hello" };

        const result = match(val)
            .with({ kind: "some" }, o => o.value)
            .run();

        expect(result).to.equal("hello");
    });

    it("should return input object", () => {
        type Option<a = any> = { kind: "none" } | { kind: "some"; value: a };
        const val: Option = { kind: "some", value: "hello" };

        const result = match(val)
            .with({ kind: "some" }, o => o)
            .run();

        expect(result).to.deep.equal({ kind: "some", value: "hello" });
    });

    describe("remove value type", () => {
        it("should not match", () => {
            type Option<a = any> = { kind: "none" } | { kind: "some"; value: a };
            const val = { kind: "some", value: "hello" };

            const result = match(val)
                .with({ kind: "none" }, o => o.value)
                .run();

            expect(result).to.be.undefined;
        });

        it("should evaluate the otherwise expression", () => {
            type Option<a = any> = { kind: "none" } | { kind: "some"; value: a };
            const val = { kind: "some", value: "hello" };

            const result = match(val)
                .with({ kind: "none" }, o => o.value)
                .otherwise(() => "none")
                .run();

            expect(result).to.equal("none");
        });
    });
});
