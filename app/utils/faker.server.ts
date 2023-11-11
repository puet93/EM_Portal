export const fakeAysncRequest = async (
	returnValue: any,
	timeout: number = 1000
) => {
	return await new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve(returnValue);
		}, timeout);
	});
};
