/*
 * Meal planner data: ingredients (with estimated US grocery prices), recipes,
 * plan styles and cooking appliances.
 *
 * Prices are rough per-unit estimates for a typical US supermarket and are used
 * only to estimate costs against the weekly budget. Recipe quantities are per
 * serving.
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    'Produce',
    'Meat & Seafood',
    'Dairy & Eggs',
    'Plant Protein',
    'Bread & Grains',
    'Canned & Dry Goods',
    'Frozen',
    'Nuts, Seeds & Snacks',
    'Oils, Spices & Condiments',
  ];

  // Units counted in whole items are rounded up on the shopping list.
  const WHOLE_UNITS = ['each', 'can', 'slice', 'clove', 'stalk', 'scoop'];

  function ing(name, cat, unit, price, opts) {
    const o = opts || {};
    return {
      name,
      cat,
      unit,
      price,
      meat: !!o.meat,
      fish: !!o.fish,
      dairy: !!o.dairy,
      egg: !!o.egg,
      gluten: !!o.gluten,
      honey: !!o.honey,
      staple: !!o.staple,
    };
  }

  const P = 'Produce';
  const M = 'Meat & Seafood';
  const DE = 'Dairy & Eggs';
  const PP = 'Plant Protein';
  const BG = 'Bread & Grains';
  const CD = 'Canned & Dry Goods';
  const FR = 'Frozen';
  const NS = 'Nuts, Seeds & Snacks';
  const OC = 'Oils, Spices & Condiments';

  const INGREDIENTS = {
    // Dairy & eggs
    eggs: ing('Eggs', DE, 'each', 0.3, { egg: true }),
    egg_whites: ing('Liquid egg whites', DE, 'cup', 1.5, { egg: true }),
    milk: ing('Milk', DE, 'cup', 0.25, { dairy: true }),
    almond_milk: ing('Unsweetened almond milk', DE, 'cup', 0.35),
    greek_yogurt: ing('Plain Greek yogurt', DE, 'cup', 1.25, { dairy: true }),
    cottage_cheese: ing('Cottage cheese', DE, 'cup', 1.2, { dairy: true }),
    cheddar: ing('Shredded cheddar', DE, 'cup', 1.6, { dairy: true }),
    mozzarella: ing('Shredded mozzarella', DE, 'cup', 1.5, { dairy: true }),
    feta: ing('Feta cheese', DE, 'oz', 0.55, { dairy: true }),
    parmesan: ing('Grated parmesan', DE, 'tbsp', 0.2, { dairy: true }),
    butter: ing('Butter', DE, 'tbsp', 0.15, { dairy: true }),

    // Plant protein
    tofu: ing('Extra-firm tofu', PP, 'oz', 0.18),
    hummus: ing('Hummus', PP, 'tbsp', 0.15),

    // Meat & seafood
    chicken_breast: ing('Chicken breast', M, 'lb', 3.99, { meat: true }),
    chicken_thigh: ing('Boneless chicken thighs', M, 'lb', 3.29, { meat: true }),
    ground_turkey: ing('Ground turkey', M, 'lb', 4.99, { meat: true }),
    ground_beef: ing('Lean ground beef', M, 'lb', 5.99, { meat: true }),
    steak: ing('Sirloin or flank steak', M, 'lb', 9.99, { meat: true }),
    pork_chop: ing('Boneless pork chops', M, 'lb', 3.99, { meat: true }),
    salmon: ing('Salmon fillet', M, 'lb', 10.99, { fish: true }),
    deli_turkey: ing('Sliced deli turkey', M, 'oz', 0.6, { meat: true }),
    bacon: ing('Bacon', M, 'slice', 0.4, { meat: true }),

    // Bread & grains
    oats: ing('Rolled oats', BG, 'cup', 0.3),
    bread: ing('Whole-wheat bread', BG, 'slice', 0.2, { gluten: true }),
    tortilla: ing('Whole-wheat tortillas', BG, 'each', 0.3, { gluten: true }),
    corn_tortilla: ing('Corn tortillas', BG, 'each', 0.1),
    pita: ing('Whole-wheat pita', BG, 'each', 0.5, { gluten: true }),
    english_muffin: ing('English muffins', BG, 'each', 0.5, { gluten: true }),
    rice: ing('Brown rice (dry)', BG, 'cup', 0.5),
    quinoa: ing('Quinoa (dry)', BG, 'cup', 1.2),
    pasta: ing('Whole-wheat pasta', BG, 'oz', 0.12, { gluten: true }),
    granola: ing('Granola', BG, 'cup', 1.5, { gluten: true }),

    // Canned & dry goods
    tuna: ing('Canned tuna', CD, 'can', 1.29, { fish: true }),
    chickpeas: ing('Canned chickpeas', CD, 'can', 1.0),
    black_beans: ing('Canned black beans', CD, 'can', 0.95),
    lentils: ing('Dry lentils', CD, 'cup', 0.7),
    canned_tomatoes: ing('Canned diced tomatoes', CD, 'can', 1.0),
    coconut_milk: ing('Canned coconut milk', CD, 'can', 1.8),
    veg_broth: ing('Vegetable broth', CD, 'cup', 0.45),
    marinara: ing('Marinara sauce', CD, 'cup', 0.9),
    protein_powder: ing('Protein powder', CD, 'scoop', 1.1, { dairy: true }),

    // Frozen
    berries: ing('Frozen mixed berries', FR, 'cup', 1.0),
    edamame: ing('Frozen shelled edamame', FR, 'cup', 1.2),
    shrimp: ing('Frozen shrimp', FR, 'lb', 8.99, { fish: true }),
    frozen_veg: ing('Frozen mixed vegetables', FR, 'cup', 0.6),
    cauliflower_rice: ing('Frozen cauliflower rice', FR, 'cup', 0.9),

    // Produce
    banana: ing('Bananas', P, 'each', 0.25),
    apple: ing('Apples', P, 'each', 0.75),
    avocado: ing('Avocados', P, 'each', 1.25),
    spinach: ing('Baby spinach', P, 'cup', 0.3),
    mixed_greens: ing('Mixed salad greens', P, 'cup', 0.4),
    tomato: ing('Tomatoes', P, 'each', 0.6),
    cherry_tomatoes: ing('Cherry tomatoes', P, 'cup', 1.0),
    cucumber: ing('Cucumbers', P, 'each', 0.8),
    bell_pepper: ing('Bell peppers', P, 'each', 1.0),
    onion: ing('Onions', P, 'each', 0.6),
    garlic: ing('Garlic', P, 'clove', 0.08),
    broccoli: ing('Broccoli florets', P, 'cup', 0.6),
    carrots: ing('Carrots', P, 'each', 0.15),
    celery: ing('Celery', P, 'stalk', 0.2),
    sweet_potato: ing('Sweet potatoes', P, 'each', 1.0),
    potato: ing('Russet potatoes', P, 'each', 0.6),
    zucchini: ing('Zucchini', P, 'each', 0.9),
    mushrooms: ing('Mushrooms', P, 'cup', 0.7),
    green_beans: ing('Green beans', P, 'cup', 0.7),
    cabbage: ing('Shredded cabbage', P, 'cup', 0.25),
    lemon: ing('Lemons', P, 'each', 0.6),
    lime: ing('Limes', P, 'each', 0.35),
    green_onion: ing('Green onions', P, 'stalk', 0.1),

    // Nuts, seeds & snacks
    peanut_butter: ing('Peanut butter', NS, 'tbsp', 0.1),
    almond_butter: ing('Almond butter', NS, 'tbsp', 0.3),
    almonds: ing('Almonds', NS, 'oz', 0.45),
    walnuts: ing('Walnuts', NS, 'oz', 0.55),
    chia: ing('Chia seeds', NS, 'tbsp', 0.25),
    flax: ing('Ground flaxseed', NS, 'tbsp', 0.12),
    popcorn: ing('Popcorn kernels', NS, 'tbsp', 0.05),
    dark_chocolate: ing('Dark chocolate', NS, 'oz', 0.6),
    rice_cakes: ing('Rice cakes', NS, 'each', 0.15),

    // Oils, spices & condiments (staples most kitchens already have)
    olive_oil: ing('Olive oil', OC, 'tbsp', 0.12, { staple: true }),
    spices: ing('Spices & seasoning', OC, 'tsp', 0.05, { staple: true }),
    soy_sauce: ing('Soy sauce', OC, 'tbsp', 0.06, { gluten: true, staple: true }),
    honey: ing('Honey', OC, 'tbsp', 0.15, { honey: true }),
    maple_syrup: ing('Maple syrup', OC, 'tbsp', 0.25),
    salsa: ing('Salsa', OC, 'tbsp', 0.08),
    pesto: ing('Basil pesto', OC, 'tbsp', 0.3, { dairy: true }),
    mustard: ing('Mustard', OC, 'tbsp', 0.05, { staple: true }),
    mayo: ing('Mayonnaise', OC, 'tbsp', 0.07, { egg: true, staple: true }),
    bbq_sauce: ing('BBQ sauce', OC, 'tbsp', 0.08),
    tahini: ing('Tahini', OC, 'tbsp', 0.25),
  };

  const APPLIANCES = [
    { id: 'stovetop', label: 'Stovetop' },
    { id: 'oven', label: 'Oven' },
    { id: 'microwave', label: 'Microwave' },
    { id: 'airfryer', label: 'Air fryer' },
    { id: 'slowcooker', label: 'Slow cooker' },
    { id: 'instantpot', label: 'Instant Pot / pressure cooker' },
    { id: 'blender', label: 'Blender' },
    { id: 'toaster', label: 'Toaster' },
    { id: 'grill', label: 'Grill' },
  ];

  // Thresholds: [main meal, snack]. Rules live in planner.js.
  const STYLES = [
    { id: 'balanced', label: 'Balanced', desc: 'Everything goes. No restrictions.' },
    { id: 'highProtein', label: 'High protein', desc: '25g+ protein per meal, 12g+ per snack.' },
    { id: 'highFiber', label: 'High fiber', desc: '8g+ fiber per meal, 4g+ per snack.' },
    { id: 'lowCarb', label: 'Low carb', desc: '25g carbs or less per meal, 12g per snack.' },
    { id: 'keto', label: 'Keto', desc: '12g carbs or less per meal, 6g per snack.' },
    { id: 'moneySaver', label: 'Money saver', desc: '$2.50 or less per serving, $1 per snack.' },
    { id: 'lowCalorie', label: 'Low calorie', desc: '450 kcal or less per meal, 180 per snack.' },
    { id: 'vegetarian', label: 'Vegetarian', desc: 'No meat or fish.' },
    { id: 'vegan', label: 'Vegan', desc: 'No animal products.' },
    { id: 'pescatarian', label: 'Pescatarian', desc: 'Fish and seafood, no other meat.' },
    { id: 'glutenFree', label: 'Gluten free', desc: 'No wheat-based bread, pasta or soy sauce.' },
    { id: 'mediterranean', label: 'Mediterranean', desc: 'Olive oil, veggies, legumes, fish.' },
    { id: 'quick', label: 'Quick (15 min)', desc: 'Ready in 15 minutes or less.' },
  ];

  const MEALS = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'snack', label: 'Snack' },
  ];

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // r(id, name, meal, minutes, appliances, ingredients, [kcal, protein, carbs, fiber], extra)
  // appliances: every entry is required; "a|b" means either a or b works. [] = no cooking.
  function r(id, name, meal, time, appliances, ingredients, macros, extra) {
    return Object.assign(
      {
        id,
        name,
        meal,
        time,
        appliances,
        ingredients,
        kcal: macros[0],
        protein: macros[1],
        carbs: macros[2],
        fiber: macros[3],
        med: false,
      },
      extra || {}
    );
  }

  const MED = { med: true };

  const RECIPES = [
    // Breakfast
    r('b-parfait', 'Greek yogurt berry parfait', 'breakfast', 5, [],
      [['greek_yogurt', 1], ['berries', 0.5], ['granola', 0.25], ['honey', 1]], [330, 24, 42, 5], MED),
    r('b-shakshuka', 'Shakshuka with feta', 'breakfast', 25, ['stovetop'],
      [['eggs', 2], ['canned_tomatoes', 0.5], ['onion', 0.25], ['bell_pepper', 0.5], ['feta', 0.5], ['spices', 1], ['bread', 1]],
      [360, 19, 28, 6], MED),
    r('b-overnight-oats', 'Peanut butter overnight oats', 'breakfast', 5, [],
      [['oats', 0.5], ['milk', 1], ['chia', 1], ['peanut_butter', 1], ['banana', 0.5]], [430, 17, 55, 11]),
    r('b-veggie-scramble', 'Veggie egg scramble', 'breakfast', 12, ['stovetop'],
      [['eggs', 3], ['egg_whites', 0.25], ['spinach', 1], ['bell_pepper', 0.5], ['onion', 0.25], ['cheddar', 0.125], ['olive_oil', 0.5]],
      [360, 28, 9, 2]),
    r('b-egg-muffins', 'Spinach & feta egg muffins', 'breakfast', 25, ['oven|airfryer'],
      [['eggs', 2], ['spinach', 0.5], ['feta', 1], ['tomato', 0.25], ['spices', 0.5]], [220, 15, 3, 1], MED),
    r('b-protein-smoothie', 'Berry protein smoothie', 'breakfast', 5, ['blender'],
      [['protein_powder', 1], ['banana', 1], ['berries', 0.5], ['almond_milk', 1], ['flax', 1]], [330, 28, 40, 7]),
    r('b-avocado-toast', 'Avocado toast with eggs', 'breakfast', 10, ['toaster|oven', 'stovetop'],
      [['bread', 2], ['avocado', 0.5], ['eggs', 2], ['spices', 0.25]], [420, 19, 32, 10], MED),
    r('b-pb-toast', 'Peanut butter banana toast', 'breakfast', 5, ['toaster|oven'],
      [['bread', 2], ['peanut_butter', 2], ['banana', 1]], [450, 15, 58, 8]),
    r('b-cottage-bowl', 'Cottage cheese, berry & walnut bowl', 'breakfast', 5, [],
      [['cottage_cheese', 1], ['berries', 0.5], ['walnuts', 0.5], ['spices', 0.5]], [330, 29, 20, 4]),
    r('b-burrito', 'Black bean breakfast burrito', 'breakfast', 15, ['stovetop'],
      [['tortilla', 1], ['eggs', 2], ['black_beans', 0.25], ['cheddar', 0.125], ['salsa', 2]], [470, 25, 40, 9]),
    r('b-mug-omelet', 'Microwave mug omelet', 'breakfast', 5, ['microwave'],
      [['eggs', 2], ['egg_whites', 0.25], ['spinach', 0.5], ['bell_pepper', 0.25], ['cheddar', 0.125]], [260, 23, 4, 1]),
    r('b-tofu-scramble', 'Tofu veggie scramble', 'breakfast', 15, ['stovetop'],
      [['tofu', 7], ['spinach', 1], ['onion', 0.25], ['bell_pepper', 0.5], ['spices', 1], ['olive_oil', 0.5]], [280, 25, 10, 4]),
    r('b-baked-oat-cups', 'Baked berry oatmeal cups', 'breakfast', 30, ['oven|airfryer'],
      [['oats', 0.5], ['milk', 0.5], ['eggs', 0.5], ['berries', 0.25], ['maple_syrup', 0.5], ['spices', 0.5]], [280, 10, 44, 5]),
    r('b-apple-oatmeal', 'Apple cinnamon oatmeal', 'breakfast', 5, ['microwave|stovetop'],
      [['oats', 0.5], ['almond_milk', 1], ['apple', 0.5], ['walnuts', 0.5], ['flax', 1], ['spices', 0.5]], [340, 9, 46, 9]),
    r('b-egg-muffin-sandwich', 'Bacon, egg & cheese English muffin', 'breakfast', 10, ['stovetop'],
      [['english_muffin', 1], ['eggs', 1], ['bacon', 2], ['cheddar', 0.0625]], [380, 21, 28, 4]),
    r('b-chia-pudding', 'Berry chia pudding', 'breakfast', 5, [],
      [['chia', 3], ['almond_milk', 1], ['berries', 0.5], ['maple_syrup', 0.5]], [300, 7, 30, 15]),
    r('b-sweet-potato-hash', 'Sweet potato & egg hash', 'breakfast', 20, ['stovetop|airfryer'],
      [['sweet_potato', 1], ['eggs', 2], ['onion', 0.25], ['bell_pepper', 0.5], ['olive_oil', 1]], [420, 16, 40, 7]),
    r('b-green-smoothie-bowl', 'Green smoothie bowl', 'breakfast', 5, ['blender'],
      [['spinach', 1], ['banana', 1], ['almond_butter', 1], ['almond_milk', 0.75], ['chia', 1]], [360, 9, 45, 11]),

    // Lunch
    r('l-turkey-wrap', 'Turkey avocado wrap', 'lunch', 5, [],
      [['tortilla', 1], ['deli_turkey', 4], ['avocado', 0.25], ['mixed_greens', 0.5], ['tomato', 0.25], ['mustard', 1]],
      [400, 28, 30, 8]),
    r('l-chickpea-salad', 'Greek chickpea salad', 'lunch', 10, [],
      [['chickpeas', 0.5], ['cucumber', 0.5], ['cherry_tomatoes', 0.5], ['feta', 1], ['onion', 0.1], ['olive_oil', 1], ['lemon', 0.25]],
      [430, 16, 40, 11], MED),
    r('l-tuna-lettuce-wraps', 'Tuna salad lettuce wraps', 'lunch', 10, [],
      [['tuna', 1], ['mayo', 1], ['celery', 1], ['mixed_greens', 1], ['lemon', 0.25]], [280, 32, 4, 2]),
    r('l-burrito-bowl', 'Chicken burrito bowl', 'lunch', 30, ['stovetop'],
      [['chicken_breast', 0.3], ['rice', 0.25], ['black_beans', 0.25], ['salsa', 2], ['cheddar', 0.125], ['lime', 0.25]],
      [560, 42, 58, 10]),
    r('l-lentil-soup', 'Hearty lentil soup', 'lunch', 40, ['stovetop|slowcooker|instantpot'],
      [['lentils', 0.33], ['carrots', 1], ['celery', 1], ['onion', 0.25], ['canned_tomatoes', 0.25], ['veg_broth', 1.5], ['spices', 1]],
      [320, 18, 52, 16], MED),
    r('l-quinoa-bowl', 'Quinoa chickpea power bowl', 'lunch', 20, ['stovetop|instantpot'],
      [['quinoa', 0.25], ['chickpeas', 0.25], ['spinach', 1], ['cucumber', 0.25], ['tahini', 1], ['lemon', 0.25]],
      [470, 17, 58, 12], MED),
    r('l-quesadilla', 'Black bean & cheese quesadilla', 'lunch', 10, ['stovetop'],
      [['tortilla', 2], ['black_beans', 0.33], ['cheddar', 0.25], ['salsa', 2]], [520, 22, 60, 14]),
    r('l-egg-salad', 'Egg salad sandwich', 'lunch', 15, ['stovetop|instantpot'],
      [['bread', 2], ['eggs', 2], ['mayo', 1], ['mustard', 0.5], ['mixed_greens', 0.25]], [420, 20, 26, 4]),
    r('l-chicken-caesar', 'Chicken Caesar salad (yogurt dressing)', 'lunch', 20, ['stovetop|airfryer|oven|grill'],
      [['chicken_breast', 0.3], ['mixed_greens', 2], ['parmesan', 2], ['greek_yogurt', 0.25], ['lemon', 0.25]], [330, 45, 10, 3]),
    r('l-hummus-pita', 'Hummus veggie pita', 'lunch', 5, [],
      [['pita', 1], ['hummus', 4], ['cucumber', 0.5], ['tomato', 0.5], ['mixed_greens', 0.5], ['feta', 0.5]], [400, 14, 50, 9], MED),
    r('l-turkey-chili', 'Turkey & bean chili', 'lunch', 35, ['stovetop|slowcooker|instantpot'],
      [['ground_turkey', 0.25], ['black_beans', 0.33], ['canned_tomatoes', 0.33], ['onion', 0.25], ['bell_pepper', 0.25], ['spices', 1]],
      [380, 33, 32, 11]),
    r('l-stuffed-sweet-potato', 'Black bean stuffed sweet potato', 'lunch', 10, ['microwave|oven'],
      [['sweet_potato', 1], ['black_beans', 0.33], ['greek_yogurt', 0.125], ['salsa', 2]], [330, 15, 62, 15]),
    r('l-cobb-salad', 'Cobb salad', 'lunch', 15, ['stovetop'],
      [['mixed_greens', 2], ['eggs', 1], ['bacon', 2], ['avocado', 0.25], ['cherry_tomatoes', 0.25], ['deli_turkey', 2]],
      [450, 26, 12, 7]),
    r('l-tomato-soup-grilled-cheese', 'Tomato soup & grilled cheese', 'lunch', 20, ['stovetop'],
      [['bread', 2], ['cheddar', 0.25], ['butter', 1], ['canned_tomatoes', 0.5], ['milk', 0.25]], [560, 20, 52, 6]),
    r('l-shrimp-avocado-salad', 'Shrimp & avocado salad', 'lunch', 10, ['stovetop'],
      [['shrimp', 0.25], ['avocado', 0.5], ['mixed_greens', 2], ['lime', 0.5], ['cherry_tomatoes', 0.25], ['olive_oil', 0.5]],
      [360, 27, 13, 8], MED),
    r('l-tuna-pasta-salad', 'Mediterranean tuna pasta salad', 'lunch', 20, ['stovetop'],
      [['pasta', 2], ['tuna', 1], ['cucumber', 0.25], ['cherry_tomatoes', 0.25], ['olive_oil', 1], ['lemon', 0.25], ['feta', 0.5]],
      [520, 36, 45, 6], MED),
    r('l-edamame-bowl', 'Edamame & veggie rice bowl', 'lunch', 10, ['microwave|stovetop'],
      [['edamame', 0.75], ['rice', 0.25], ['carrots', 1], ['cabbage', 0.5], ['soy_sauce', 1], ['green_onion', 1]],
      [450, 22, 62, 11]),
    r('l-chickpea-smash', 'Smashed chickpea salad sandwich', 'lunch', 10, [],
      [['bread', 2], ['chickpeas', 0.33], ['tahini', 1], ['lemon', 0.25], ['celery', 1], ['mixed_greens', 0.5]],
      [430, 16, 55, 12]),

    // Dinner
    r('d-sheet-pan-chicken', 'Sheet pan chicken & veggies', 'dinner', 35, ['oven|airfryer'],
      [['chicken_breast', 0.33], ['broccoli', 1], ['sweet_potato', 0.5], ['olive_oil', 1], ['spices', 1]], [430, 42, 30, 7]),
    r('d-baked-salmon', 'Lemon salmon, quinoa & green beans', 'dinner', 30, ['oven|airfryer', 'stovetop|instantpot'],
      [['salmon', 0.33], ['quinoa', 0.25], ['green_beans', 1], ['lemon', 0.25], ['olive_oil', 0.5]], [540, 40, 42, 7], MED),
    r('d-turkey-tacos', 'Turkey tacos with slaw', 'dinner', 20, ['stovetop'],
      [['ground_turkey', 0.25], ['corn_tortilla', 3], ['cabbage', 0.5], ['salsa', 2], ['lime', 0.25], ['spices', 1]],
      [430, 27, 38, 6]),
    r('d-spaghetti', 'Spaghetti with meat sauce', 'dinner', 25, ['stovetop'],
      [['pasta', 3], ['ground_beef', 0.25], ['marinara', 0.5], ['parmesan', 1], ['onion', 0.1]], [620, 35, 70, 9]),
    r('d-sweet-potato-chili', 'Black bean & sweet potato chili', 'dinner', 40, ['stovetop|slowcooker|instantpot'],
      [['black_beans', 0.5], ['sweet_potato', 0.5], ['canned_tomatoes', 0.33], ['onion', 0.25], ['bell_pepper', 0.25], ['spices', 1]],
      [380, 15, 70, 20]),
    r('d-chicken-stir-fry', 'Chicken stir-fry with brown rice', 'dinner', 30, ['stovetop'],
      [['chicken_breast', 0.33], ['broccoli', 1], ['bell_pepper', 0.5], ['soy_sauce', 1.5], ['rice', 0.25], ['garlic', 1], ['olive_oil', 0.5]],
      [520, 44, 55, 6]),
    r('d-shrimp-zoodles', 'Shrimp pesto zucchini noodles', 'dinner', 15, ['stovetop'],
      [['zucchini', 2], ['shrimp', 0.33], ['pesto', 1.5], ['cherry_tomatoes', 0.25], ['parmesan', 1]], [380, 33, 14, 4], MED),
    r('d-steak-veggies', 'Garlic butter steak & green beans', 'dinner', 25, ['stovetop|grill'],
      [['steak', 0.375], ['mushrooms', 1], ['green_beans', 1], ['butter', 1], ['garlic', 1]], [520, 48, 14, 5]),
    r('d-chicken-curry', 'Coconut chicken curry & rice', 'dinner', 45, ['slowcooker|instantpot|stovetop'],
      [['chicken_thigh', 0.33], ['coconut_milk', 0.33], ['canned_tomatoes', 0.25], ['onion', 0.25], ['spices', 2], ['rice', 0.25]],
      [600, 34, 52, 4]),
    r('d-lentil-dal', 'Red lentil dal with spinach', 'dinner', 35, ['stovetop|instantpot|slowcooker'],
      [['lentils', 0.33], ['coconut_milk', 0.25], ['canned_tomatoes', 0.25], ['onion', 0.25], ['garlic', 1], ['spices', 1], ['spinach', 1], ['rice', 0.25]],
      [520, 22, 76, 18]),
    r('d-air-fryer-salmon', 'Salmon with cauliflower rice & broccoli', 'dinner', 20, ['airfryer|oven', 'microwave|stovetop'],
      [['salmon', 0.33], ['cauliflower_rice', 1], ['broccoli', 1], ['olive_oil', 0.5], ['lemon', 0.25]], [400, 37, 12, 5], MED),
    r('d-pork-chops', 'Pork chops with apples & green beans', 'dinner', 30, ['oven|stovetop|airfryer'],
      [['pork_chop', 0.4], ['apple', 0.5], ['green_beans', 1], ['olive_oil', 0.5], ['spices', 0.5]], [450, 40, 22, 6]),
    r('d-fried-rice', 'Veggie egg fried rice', 'dinner', 20, ['stovetop'],
      [['rice', 0.25], ['eggs', 2], ['frozen_veg', 1], ['soy_sauce', 1], ['green_onion', 1], ['olive_oil', 0.5]], [450, 18, 60, 6]),
    r('d-tofu-stir-fry', 'Tofu & broccoli stir-fry', 'dinner', 25, ['stovetop'],
      [['tofu', 7], ['broccoli', 1], ['bell_pepper', 0.5], ['soy_sauce', 1.5], ['rice', 0.25], ['garlic', 1]], [470, 28, 52, 7]),
    r('d-souvlaki', 'Chicken souvlaki pita with tzatziki', 'dinner', 30, ['grill|stovetop|oven|airfryer'],
      [['chicken_breast', 0.33], ['greek_yogurt', 0.25], ['cucumber', 0.25], ['pita', 1], ['tomato', 0.5], ['lemon', 0.25], ['olive_oil', 0.5]],
      [520, 50, 40, 4], MED),
    r('d-stuffed-peppers', 'Turkey stuffed bell peppers', 'dinner', 45, ['oven|airfryer', 'stovetop|microwave'],
      [['bell_pepper', 1], ['ground_turkey', 0.25], ['rice', 0.125], ['marinara', 0.25], ['mozzarella', 0.125]], [420, 31, 30, 4]),
    r('d-beef-broccoli', 'Beef & broccoli with cauliflower rice', 'dinner', 20, ['stovetop'],
      [['steak', 0.33], ['broccoli', 1.5], ['soy_sauce', 1], ['garlic', 1], ['cauliflower_rice', 1]], [410, 40, 15, 6]),
    r('d-baked-potato', 'Loaded broccoli baked potato', 'dinner', 15, ['microwave|oven|airfryer'],
      [['potato', 1], ['broccoli', 0.5], ['cheddar', 0.25], ['greek_yogurt', 0.125], ['green_onion', 1]], [420, 18, 55, 7]),
    r('d-chickpea-sheet-pan', 'Mediterranean chickpea sheet pan', 'dinner', 30, ['oven|airfryer'],
      [['chickpeas', 0.5], ['zucchini', 0.5], ['bell_pepper', 0.5], ['onion', 0.25], ['olive_oil', 1], ['feta', 1], ['spices', 1]],
      [440, 17, 46, 13], MED),
    r('d-pasta-primavera', 'Pasta primavera', 'dinner', 25, ['stovetop'],
      [['pasta', 3], ['zucchini', 0.5], ['cherry_tomatoes', 0.5], ['spinach', 1], ['garlic', 1], ['olive_oil', 1], ['parmesan', 1]],
      [520, 18, 76, 11], MED),
    r('d-bbq-chicken', 'Pulled BBQ chicken with yogurt slaw', 'dinner', 240, ['slowcooker|instantpot|oven'],
      [['chicken_breast', 0.33], ['bbq_sauce', 2], ['cabbage', 1], ['greek_yogurt', 0.125]], [330, 41, 26, 3]),
    r('d-bean-burrito-bowl', 'Microwave bean & veggie burrito bowl', 'dinner', 10, ['microwave|stovetop'],
      [['black_beans', 0.5], ['frozen_veg', 1], ['rice', 0.25], ['salsa', 2], ['cheddar', 0.125]], [500, 20, 85, 18]),
    r('d-mezze-plate', 'No-cook Mediterranean mezze plate', 'dinner', 10, [],
      [['hummus', 4], ['pita', 1], ['cucumber', 0.5], ['cherry_tomatoes', 0.5], ['feta', 1], ['chickpeas', 0.25]],
      [480, 19, 56, 12], MED),
    r('d-tuna-chickpea-salad', 'No-cook tuna & chickpea salad', 'dinner', 10, [],
      [['tuna', 1], ['chickpeas', 0.5], ['spinach', 2], ['lemon', 0.5], ['olive_oil', 1], ['onion', 0.1]],
      [460, 40, 36, 10], MED),
    r('d-chicken-thighs-broccoli', 'Crispy chicken thighs & roasted broccoli', 'dinner', 35, ['oven|airfryer'],
      [['chicken_thigh', 0.4], ['broccoli', 1.5], ['olive_oil', 1], ['spices', 1]], [450, 40, 9, 4]),
    r('d-turkey-lettuce-tacos', 'Turkey taco lettuce wraps', 'dinner', 20, ['stovetop'],
      [['ground_turkey', 0.33], ['mixed_greens', 1], ['avocado', 0.25], ['salsa', 2], ['cheddar', 0.125], ['spices', 1]],
      [420, 36, 9, 5]),
    r('d-salmon-spinach', 'Garlic butter salmon & spinach', 'dinner', 15, ['stovetop'],
      [['salmon', 0.33], ['spinach', 2], ['butter', 1], ['garlic', 1], ['lemon', 0.25]], [430, 38, 6, 2], MED),
    r('d-bunless-burger', 'Bunless cheeseburger & side salad', 'dinner', 15, ['stovetop|grill'],
      [['ground_beef', 0.33], ['mixed_greens', 2], ['cheddar', 0.125], ['tomato', 0.5], ['mustard', 1]], [520, 40, 7, 2]),
    r('d-black-bean-tacos', 'Black bean & avocado tacos', 'dinner', 15, ['stovetop|microwave'],
      [['black_beans', 0.5], ['corn_tortilla', 3], ['cabbage', 0.5], ['avocado', 0.25], ['salsa', 2], ['lime', 0.25]],
      [480, 17, 72, 22]),
    r('d-chickpea-curry', 'Chickpea coconut curry', 'dinner', 25, ['stovetop|instantpot'],
      [['chickpeas', 0.5], ['coconut_milk', 0.25], ['spinach', 1], ['canned_tomatoes', 0.25], ['onion', 0.25], ['spices', 1.5], ['rice', 0.25]],
      [560, 17, 72, 14]),

    // Snacks
    r('s-apple-pb', 'Apple & peanut butter', 'snack', 2, [], [['apple', 1], ['peanut_butter', 2]], [270, 8, 30, 6]),
    r('s-hummus-veggies', 'Hummus & veggie sticks', 'snack', 5, [],
      [['hummus', 4], ['carrots', 2], ['cucumber', 0.5]], [180, 6, 18, 6], MED),
    r('s-yogurt-honey', 'Greek yogurt with honey', 'snack', 2, [], [['greek_yogurt', 0.75], ['honey', 0.5]], [150, 17, 15, 0]),
    r('s-boiled-eggs', 'Hard-boiled eggs', 'snack', 12, ['stovetop|instantpot'], [['eggs', 2], ['spices', 0.25]], [140, 12, 1, 0]),
    r('s-almonds', 'Handful of almonds', 'snack', 1, [], [['almonds', 1]], [165, 6, 6, 4], MED),
    r('s-cottage-berries', 'Cottage cheese & berries', 'snack', 2, [], [['cottage_cheese', 0.5], ['berries', 0.25]], [130, 13, 12, 2]),
    r('s-roasted-chickpeas', 'Crispy roasted chickpeas', 'snack', 25, ['oven|airfryer'],
      [['chickpeas', 0.33], ['olive_oil', 0.5], ['spices', 0.5]], [170, 7, 22, 6], MED),
    r('s-popcorn', 'Homemade popcorn', 'snack', 5, ['stovetop|microwave'], [['popcorn', 3], ['olive_oil', 0.5]], [130, 4, 20, 4]),
    r('s-edamame', 'Steamed edamame', 'snack', 5, ['microwave|stovetop'], [['edamame', 0.75], ['spices', 0.25]], [140, 13, 10, 6]),
    r('s-protein-shake', 'Protein shake', 'snack', 2, ['blender'], [['protein_powder', 1], ['almond_milk', 1]], [160, 25, 4, 1]),
    r('s-turkey-rollups', 'Turkey & cheese roll-ups', 'snack', 3, [], [['deli_turkey', 2], ['cheddar', 0.125]], [150, 14, 2, 0]),
    r('s-rice-cakes', 'Rice cakes with almond butter', 'snack', 2, [], [['rice_cakes', 2], ['almond_butter', 1]], [170, 4, 16, 2]),
    r('s-chocolate-berries', 'Dark chocolate & berries', 'snack', 2, [], [['dark_chocolate', 1], ['berries', 0.5]], [190, 3, 20, 4]),
    r('s-banana', 'Banana', 'snack', 1, [], [['banana', 1]], [105, 1, 27, 3]),
    r('s-celery-pb', 'Celery & peanut butter', 'snack', 3, [], [['celery', 2], ['peanut_butter', 1]], [120, 4, 5, 2]),
    r('s-energy-bites', 'No-bake energy bites', 'snack', 10, [],
      [['oats', 0.25], ['peanut_butter', 1], ['honey', 0.5], ['chia', 0.5], ['dark_chocolate', 0.25]], [230, 7, 26, 5]),
    r('s-cheese-walnuts', 'Cheese & walnuts', 'snack', 1, [], [['cheddar', 0.125], ['walnuts', 0.5]], [160, 6, 2, 1]),
  ];

  const data = { CATEGORIES, WHOLE_UNITS, INGREDIENTS, APPLIANCES, STYLES, MEALS, DAYS, RECIPES };

  if (typeof module === 'object' && module.exports) {
    module.exports = data;
  } else {
    root.MPData = data;
  }
})(typeof self !== 'undefined' ? self : this);
