import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  Star,
  Clock,
  Info,
  ChevronLeft,
  Search,
  Leaf,
  MessageSquare,
  Send,
  Heart,
} from "lucide-react";

interface Restaurant {
  _id: string;
  name: string;
  description: string;
  images: string[];
  rating: number;
  numReviews?: number;
  cuisine: string[];
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: any;
  isVegetarian: boolean;
  spicyLevel: number;
}

export const RestaurantDetail: React.FC = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [data, setData] = useState<{
    restaurant: Restaurant;
    categories: any[];
    menuItems: MenuItem[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    fetchRestaurant();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    checkFavoriteStatus();
  }, [id, user]);

  const getCategoryName = (category: any) => {
    if (!category) return "Menu";
    if (typeof category === "string") return category;
    return category.name || "Menu";
  };

  const fetchRestaurant = async () => {
    try {
      const json = await apiRequest(`/api/restaurants/${id}`);

      const categoryList =
        json.categories && json.categories.length > 0
          ? json.categories
          : Array.from(
              new Set(
                (json.menuItems || []).map((item: any) =>
                  getCategoryName(item.category)
                )
              )
            ).map((name) => ({ _id: name, name }));

      setData({
        restaurant: json.restaurant,
        categories: categoryList,
        menuItems: json.menuItems || [],
      });

      if (categoryList.length > 0) {
        setActiveCategory(categoryList[0].name || categoryList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await apiRequest(`/api/reviews/restaurant/${id}`);
      setReviews(data);
    } catch (err) {
      console.error(err);
      setReviews([]);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !id) return;

    try {
      const favorites = await apiRequest("/api/favorites", {
        token: user.token,
      });

      const exists = favorites.some(
        (fav: any) => fav.restaurant?._id === id
      );

      setIsFavorite(exists);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    if (!id) return;

    setFavoriteLoading(true);

    try {
      const res = await apiRequest(`/api/favorites/${id}`, {
        method: "POST",
        token: user.token,
      });

      setIsFavorite(res.favorited);
    } catch (err) {
      console.error(err);
      alert("Could not update favorite.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user) {
      alert("Please login to leave a review.");
      return;
    }

    if (!reviewComment.trim()) {
      alert("Please write a review.");
      return;
    }

    setReviewLoading(true);

    try {
      await apiRequest("/api/reviews", {
        method: "POST",
        token: user.token,
        body: JSON.stringify({
          restaurant: id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      setReviewComment("");
      setReviewRating(5);
      fetchReviews();
      fetchRestaurant();
    } catch (err) {
      console.error(err);
      alert("Could not submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 font-bold">Restaurant not found</div>;
  }

  const { restaurant, categories, menuItems } = data;

  const filteredItems = menuItems.filter((item) => {
    const itemCategory = getCategoryName(item.category);
    const matchesCategory = !activeCategory || itemCategory === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <img
          src={
            restaurant.images?.[0] ||
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000"
          }
          className="w-full h-full object-cover"
          alt={restaurant.name}
          referrerPolicy="no-referrer"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <Link
          to="/"
          className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/40 transition-all"
        >
          <ChevronLeft size={24} />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 mb-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-gray-200 border border-gray-100"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">
                {restaurant.name}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <Star fill="#f97316" className="text-orange-500" size={18} />
                  <span className="text-gray-900 font-bold">
                    {restaurant.rating || 0}
                  </span>
                  <span>({restaurant.numReviews || reviews.length || 0} reviews)</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  <span>20-30 min</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                  <span>{(restaurant.cuisine || []).join(" • ")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-60 ${
                  isFavorite
                    ? "bg-red-500 text-white"
                    : "bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <Heart
                  size={18}
                  fill={isFavorite ? "currentColor" : "none"}
                />
                {isFavorite ? "Saved" : "Save"}
              </button>

              <a
                href="#reviews"
                className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition-all"
              >
                <Info size={18} />
                About & Reviews
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-12 pb-24">
        <div className="hidden lg:block space-y-2 sticky top-28 h-fit">
          <h3 className="text-xs uppercase font-black tracking-widest text-gray-400 mb-6 pl-4">
            Menu Categories
          </h3>

          {categories.map((cat: any) => {
            const name = cat.name || cat;

            return (
              <button
                key={cat._id || name}
                onClick={() => setActiveCategory(name)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-sm transition-all ${
                  activeCategory === name
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100 translate-x-2"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3">
          <div className="relative mb-10">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in this menu..."
              className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-orange-500 rounded-3xl outline-none text-sm transition-all shadow-sm"
            />
          </div>

          <section>
            <h2 className="text-3xl font-black text-gray-900 mb-8 px-2 flex items-center justify-between uppercase tracking-tighter">
              {activeCategory || "Menu"}
              <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                {filteredItems.length} Items
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredItems.map((item) => (
                <motion.div
                  key={item._id}
                  whileHover={{ y: -4 }}
                  className="bg-white p-6 rounded-[32px] border border-gray-100 flex gap-6 hover:shadow-xl hover:shadow-gray-100 transition-all"
                >
                  <div className="w-28 h-28 flex-shrink-0 bg-gray-100 rounded-[24px] overflow-hidden">
                    <img
                      src={item.image || "https://via.placeholder.com/150?text=Food"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {item.isVegetarian ? (
                          <Leaf size={14} className="text-green-500" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        )}

                        <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                          {item.name}
                        </h3>
                      </div>

                      <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-gray-900">
                        Rs. {item.price}
                      </span>

                      <button
                        onClick={() =>
                          addToCart({
                            id: item._id,
                            name: item.name,
                            price: item.price,
                            quantity: 1,
                            restaurantId: restaurant._id,
                            image: item.image,
                          })
                        }
                        className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-[40px] text-gray-400 font-bold">
                No items found.
              </div>
            )}
          </section>

          <section id="reviews" className="mt-20">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="text-orange-500" />
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                Reviews
              </h2>
            </div>

            <div className="bg-gray-50 rounded-[40px] p-8 mb-8">
              <h3 className="font-black text-gray-900 mb-5">Write a review</h3>

              <div className="flex gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={
                      star <= reviewRating ? "text-orange-500" : "text-gray-300"
                    }
                  >
                    <Star fill="currentColor" size={26} />
                  </button>
                ))}
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Tell others about your experience..."
                className="w-full min-h-[120px] p-5 rounded-3xl bg-white border border-gray-100 outline-none focus:border-orange-500 text-sm"
              />

              <button
                onClick={submitReview}
                disabled={reviewLoading}
                className="mt-4 px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {reviewLoading ? "Submitting..." : "Submit Review"}
              </button>
            </div>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[32px] p-8 text-center text-gray-400 font-bold">
                  No reviews yet.
                </div>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white border border-gray-100 rounded-[32px] p-6"
                  >
                    <div className="flex justify-between mb-3">
                      <div>
                        <p className="font-black text-gray-900">
                          {review.user?.name || "Customer"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex text-orange-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={16}
                            fill={s <= review.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};