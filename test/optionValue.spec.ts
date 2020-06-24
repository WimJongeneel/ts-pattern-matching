import "mocha";
import { expect } from "chai";
import { match } from "../src/main";

describe("Option Example", () => {
    type Option<a = any> = { kind: "none" } | { kind: "some"; value: a };

    it("should return value property", () => {
        const val: Option = { kind: "some", value: "hello" };

        const result = match(val)
            .with({ kind: "some" }, o => o.value)
            .run();

        expect(result).to.equal("hello");
    });

    it("should return input object", () => {
        const val: Option = { kind: "some", value: "hello" };

        const result = match(val)
            .with({ kind: "some" }, o => o)
            .run();

        expect(result).to.deep.equal({ kind: "some", value: "hello" });
    });

    describe("remove value type", () => {
        it("should not match", () => {
            const val = { kind: "some", value: "hello" };

            const result = match(val)
                .with({ kind: "none" }, o => o.value)
                .run();

            expect(result).to.be.null;
        });

        it("should evaluate the otherwise expression", () => {
            const val = { kind: "some", value: "hello" };

            const result = match(val)
                .with({ kind: "none" }, o => o.value)
                .otherwise(() => "none")
                .run();

            expect(result).to.equal("none");
        });
    });
});

describe("Array Example", () => {
    type Blog = { Id: number; Title: string };

    it("should transform blog response", () => {
        const blogOverviewResponse: any = [
            { Id: 1, Title: "title" },
            { Id: 2, Title: "title2" },
        ];

        const result = match<any, Blog[] | Error>(blogOverviewResponse)
            .with([{ Id: Number, Title: String }], r => r.map(b => ({ id: b.Id, title: b.Title })))
            .with({ errorMessage: String }, r => new Error(r.errorMessage))
            .otherwise(() => new Error("client parse error"))
            .run();

        expect(result).to.deep.equal([
            { id: 1, title: "title" },
            { id: 2, title: "title2" },
        ]);
    });

    it("should return blog response error", () => {
        const blogOverviewResponse: any = { errorMessage: "err" };

        const result = match<any, Blog[] | Error>(blogOverviewResponse)
            .with([{ Id: Number, Title: String }], r => r.map(b => ({ id: b.Id, title: b.Title })))
            .with({ errorMessage: String }, r => new Error(r.errorMessage))
            .otherwise(() => new Error("client parse error"))
            .run();

        expect(result).to.be.instanceOf(Error).and.have.property("message", "err");
    });

    it("should return client parse error", () => {
        const blogOverviewResponse: any = [
            { Id: 1, title: "title" },
            { Id: 2, Title: "title2" },
            { Id: 3, Title: "title3" },
        ];

        const result = match<any, Blog[] | Error>(blogOverviewResponse)
            .with([{ Id: Number, Title: String }], r => r.map(b => ({ id: b.Id, title: b.Title })))
            .with({ errorMessage: String }, r => new Error(r.errorMessage))
            .otherwise(() => new Error("client parse error"))
            .run();

        expect(result).to.be.instanceOf(Error).and.have.property("message", "client parse error");
    });
});
