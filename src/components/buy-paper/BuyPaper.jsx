// src/components/buy-paper/BuyPaper.jsx
import { useContext, useState, useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';
import myContext from "../../context/myContext.jsx";
import toast from "react-hot-toast";
import Loader from "../loader/Loader.jsx";
import { Timestamp, getDoc, setDoc, doc } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig.jsx";
import Payment from "../payment/Payment.jsx";

const BuyPaper = () => {
    const context = useContext(myContext);
    const { loading, setLoading } = context;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [paymentResolve, setPaymentResolve] = useState(null);
    const [poid] = useState(uuidv4());

    const handlesizeChange = (e) => {
        const newsize = e.target.value;
        setPaperOrder((prevOrder) => ({
            ...prevOrder,
            size: newsize,
            price: calculatePrice(newsize, prevOrder.pieces)
        }));
    };

    const handlePiecesChange = (e) => {
        const newPieces = parseInt(e.target.value, 10);
        setPaperOrder((prevOrder) => ({
            ...prevOrder,
            pieces: newPieces,
            price: calculatePrice(prevOrder.size, newPieces)
        }));
    };

    const calculatePrice = (size, pieces) => {
        let unitPrice = 0;
        if (size === 'a3') {
            unitPrice = 300;
        } else if (size === 'a4') {
            unitPrice = 150;
        } else if (size === 'a5') {
            unitPrice = 75;
        }
        return unitPrice * pieces;
    };

    const [paperOrder, setPaperOrder] = useState({
        size: "",
        pieces: 0,
        price: 0
    });

    const processPayment = async () => {
        return new Promise((resolve) => {
            setPaymentResolve(() => resolve);
            setIsModalOpen(true);
        });
    };

    const handleConfirmPayment = () => {
        if (paymentResolve) paymentResolve(true);
        setIsModalOpen(false);
    };

    const handleCancelPayment = () => {
        if (paymentResolve) paymentResolve(false);
        setIsModalOpen(false);
    };

    const sendPaperOrderFunction = useCallback(async () => {
        if (paperOrder.size === "" || paperOrder.pieces === 0) {
            toast.error("Tất cả trường mua giấy là bắt buộc");
            return;
        }

        setLoading(true);
        try {
            const paymentSuccessful = await processPayment();
            if (!paymentSuccessful) {
                toast.error("Thanh toán thất bại");
                setLoading(false);
                return;
            }

            const user = JSON.parse(localStorage.getItem('users'));
            const userRef = doc(fireDB, "user", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                let newPieces = paperOrder.pieces;
                if (paperOrder.size === 'a3') {
                    newPieces += userData.a3 || 0;
                    await setDoc(userRef, { a3: newPieces }, { merge: true });
                } else if (paperOrder.size === 'a4') {
                    newPieces += userData.a4 || 0;
                    await setDoc(userRef, { a4: newPieces }, { merge: true });
                } else if (paperOrder.size === 'a5') {
                    newPieces += userData.a5 || 0;
                    await setDoc(userRef, { a5: newPieces }, { merge: true });
                }

                const paperOrderData = {
                    poid,
                    timestamp: Timestamp.now(),
                    uid: user.uid,
                    size: paperOrder.size,
                    pieces: paperOrder.pieces,
                    price: paperOrder.price
                };
                await setDoc(doc(fireDB, "paper-order", `${user.uid}_${Timestamp.now().toMillis()}`), paperOrderData);

                toast.success("Gửi yêu cầu mua giấy thành công");
                setLoading(true); // Show loader before refreshing
                window.location.reload(); // Refresh the page
            } else {
                toast.error("Gửi yêu cầu mua giấy thất bại");
            }

            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
            toast.error("Gửi yêu cầu mua giấy thất bại");
        }
    }, [paperOrder, setLoading, poid]);

    return (
        <div
            className="flex-[2_0_15%] rounded-xl border border-gray-300 flex flex-col items-start justify-start p-3 relative">
            {loading && <Loader />}
            <div className="mt-5 mb-5 ml-5">
                <h2 className='text-left text-2xl font-poppins_bold'>
                    Mua giấy
                </h2>
            </div>

            <div className="w-full flex">
                <div className="w-full flex items-center mb-3 r-2 ml-5 mr-14">
                    <label htmlFor="printer" className="w-1/3">Khổ giấy:</label>
                    <select
                        className={`w-2/3 py-2 px-1 rounded-md ${
                            paperOrder.size === '' ? 'text-gray-400' : 'text-black'
                        }`}
                        value={paperOrder.size}
                        onChange={handlesizeChange}
                    >
                        <option value="" disabled hidden>
                            Chọn khổ giấy
                        </option>
                        <option value="a3" className="text-black">A3</option>
                        <option value="a4" className="text-black">A4</option>
                        <option value="a5" className="text-black">A5</option>
                    </select>
                </div>

                <div className="w-full flex items-center mb-3 pl-2 mr-5">
                    <label htmlFor="printer" className="w-1/3">Số tờ:</label>
                    <input
                        type="number"
                        className="w-2/3 border border-gray-300 p-2 rounded-md"
                        placeholder="Nhập số tờ"
                        min="1"
                        value={paperOrder.pieces}
                        onChange={handlePiecesChange}
                    />
                </div>
            </div>

            <div className="w-full flex items-center justify-between p-5">
                <span className='font-poppins_bold'>Tổng giá: {paperOrder.price} VND</span>
                <input
                    type="submit"
                    value="Mua giấy"
                    onClick={sendPaperOrderFunction}
                    className='text-white bg-black hover:bg-[#1488D8] hover:scale-105 py-2 px-4 font-poppins_bold rounded-full transition-transform duration-300'
                />
            </div>

            <Payment
                isOpen={isModalOpen}
                onRequestClose={handleCancelPayment}
                onConfirm={handleConfirmPayment}
                price={paperOrder.price}
                poid={poid}
            />
        </div>
    )
}

export default BuyPaper;